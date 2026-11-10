import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { jams, teamMembers, users } from '../db/schema.ts';
import { createTestDb } from '../testing/d1.ts';
import { createTeam, disbandTeam, leaveTeam, updateTeam } from './teams.ts';
import { myTeams } from './my-teams.ts';

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose?.());

it('lists owned and joined teams, including closed and past teams, without other users’ teams', async () => {
	const [me] = await db
		.insert(users)
		.values({ itchId: 1, username: 'me', itchUrl: 'https://me.itch.io' })
		.returning();
	const [other] = await db
		.insert(users)
		.values({ itchId: 2, username: 'other', itchUrl: 'https://other.itch.io' })
		.returning();
	const [empty] = await db
		.insert(users)
		.values({ itchId: 3, username: 'empty', itchUrl: 'https://empty.itch.io' })
		.returning();
	const now = new Date('2026-11-09T12:00:00Z');
	const makeJam = async (slug: string, endsAt: Date | null) =>
		(
			await db
				.insert(jams)
				.values({ slug, title: slug, url: `https://itch.io/jam/${slug}`, endsAt })
				.returning()
		)[0];
	const ownedJam = await makeJam('owned', null);
	const joinedJam = await makeJam('joined', new Date('2027-01-01T00:00:00Z'));
	const pastJam = await makeJam('past', new Date('2026-11-01T00:00:00Z'));
	const unrelatedJam = await makeJam('unrelated', null);
	const input = (name: string) => ({ name, description: '', openRoles: [] });
	const owned = await createTeam(db, ownedJam, me.id, input('Mine'));
	const joined = await createTeam(db, joinedJam, other.id, input('Joined'));
	const past = await createTeam(db, pastJam, other.id, input('Past'));
	await createTeam(db, unrelatedJam, other.id, input('Not mine'));
	await db.insert(teamMembers).values([
		{ teamId: joined.id, jamId: joinedJam.id, userId: me.id },
		{ teamId: past.id, jamId: pastJam.id, userId: me.id }
	]);
	await updateTeam(db, joined.id, other.id, { ...input('Joined'), status: 'full' });

	const result = await myTeams(db, me.id, now);
	expect(result.current.map((team) => team.id).sort()).toEqual([owned.id, joined.id].sort());
	expect(result.past.map((team) => team.id)).toEqual([past.id]);
	expect(result.current.find((team) => team.id === owned.id)?.isOwner).toBe(true);
	expect(result.current.find((team) => team.id === joined.id)).toMatchObject({
		isOwner: false,
		status: 'full'
	});
	expect(
		result.current
			.find((team) => team.id === joined.id)
			?.members.map((member) => member.id)
			.sort()
	).toEqual([me.id, other.id].sort());
	expect(await myTeams(db, empty.id, now)).toEqual({ current: [], past: [] });

	await leaveTeam(db, joined.id, me.id);
	await disbandTeam(db, past.id, other.id);
	const afterLeaving = await myTeams(db, me.id, now);
	expect(afterLeaving.current.map((team) => team.id)).toEqual([owned.id]);
	expect(afterLeaving.past).toEqual([]);
	expect(
		await db.query.teamMembers.findMany({ where: eq(teamMembers.userId, me.id) })
	).toHaveLength(1);
});
