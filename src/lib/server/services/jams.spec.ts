import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Db } from '../db/index.ts';
import { jams, users } from '../db/schema.ts';
import { createTestDb } from '../testing/d1.ts';
import { activeJams, searchJams } from './home.ts';
import { listJams } from './jams.ts';
import { createTeam, upsertLfgPost } from './teams.ts';

let db: Db;
let dispose: () => Promise<void>;

const day = 86_400_000;
const team = (name: string) => ({ name, description: '', openRoles: ['art' as const] });

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
	const now = Date.now();
	const [busy, quiet] = await db
		.insert(jams)
		.values([
			{
				slug: 'busy',
				title: 'Busy Jam',
				url: 'https://itch.io/jam/busy',
				startsAt: new Date(now + day),
				endsAt: new Date(now + 3 * day),
				joinedCount: 10
			},
			{
				slug: 'quiet',
				title: 'Quiet Jam',
				url: 'https://itch.io/jam/quiet',
				startsAt: new Date(now + day),
				endsAt: new Date(now + 3 * day),
				joinedCount: 9999
			}
		])
		.returning();
	const mk = async (u: string) =>
		(
			await db
				.insert(users)
				.values({
					itchId: Math.floor(Math.random() * 1e9),
					username: u,
					itchUrl: `https://${u}.itch.io`,
					onboarded: true,
					roles: ['art']
				})
				.returning()
		)[0];
	const [a, b, c] = [await mk('a'), await mk('b'), await mk('c')];
	await upsertLfgPost(db, busy, a.id, { message: '', roles: ['art'] });
	await upsertLfgPost(db, busy, b.id, { message: '', roles: ['code'] });
	await createTeam(db, busy, c.id, team('T'));
	void quiet;
});

afterAll(() => dispose?.());

// Regression: the correlated count subqueries used to compare the inner table's own id
// and always returned 0, hiding all activity and breaking "most active" sorting.
describe('jam activity counts', () => {
	it('counts open LFG posts and teams per jam', async () => {
		const rows = await listJams(db, { tab: 'upcoming', sort: 'active', limit: 10, offset: 0 });
		const busy = rows.find((r) => r.slug === 'busy')!;
		const quiet = rows.find((r) => r.slug === 'quiet')!;
		expect([busy.lookingCount, busy.teamCount]).toEqual([2, 1]);
		expect([quiet.lookingCount, quiet.teamCount]).toEqual([0, 0]);
	});

	it('sorts by activity before itch.io popularity', async () => {
		const rows = await listJams(db, { tab: 'upcoming', sort: 'active', limit: 10, offset: 0 });
		expect(rows.map((r) => r.slug)).toEqual(['busy', 'quiet']);
	});

	it('home "teaming up now" only lists jams with activity', async () => {
		expect((await activeJams(db, 6)).map((r) => [r.slug, r.lookingCount, r.teamCount])).toEqual([
			['busy', 2, 1]
		]);
	});

	it('search returns counts too', async () => {
		const [hit] = await searchJams(db, 'bus');
		expect([hit.slug, hit.lookingCount, hit.teamCount]).toEqual(['busy', 2, 1]);
	});
});
