import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { jams, notifications, teamRequests, teamUps, users, type Jam } from '../db/schema.ts';
import { createTestDb } from '../testing/d1.ts';
import { markUpdatesRead, pendingActionCount, recentUpdates } from './inbox.ts';
import {
	createTeam,
	disbandTeam,
	inviteUser,
	requestToJoin,
	respondToRequest,
	respondToTeamUp,
	sendTeamUp,
	updateTeam
} from './teams.ts';

let db: Db;
let dispose: () => Promise<void>;
let n = 0;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose?.());

const user = async (name: string) =>
	(
		await db
			.insert(users)
			.values({
				itchId: ++n,
				username: `${name}${n}`,
				displayName: name,
				itchUrl: `https://${name}.itch.io`,
				onboarded: true
			})
			.returning()
	)[0];
const jam = async (): Promise<Jam> =>
	(
		await db
			.insert(jams)
			.values({ slug: `jam-${++n}`, title: 'Jam', url: 'https://itch.io/jam/x' })
			.returning()
	)[0];
const team = (name: string) => ({ name, description: '', openRoles: [] as never[] });
const updatesFor = async (userId: string) =>
	(await recentUpdates(db, userId)).map((u) => [u.kind, u.actor.displayName, u.teamName]);

describe('inbox updates when something you sent is accepted', () => {
	it('team-up accepted → the sender is told', async () => {
		const j = await jam();
		const [mika, lucia] = [await user('Mika'), await user('Lucia')];
		await sendTeamUp(db, j, mika.id, lucia.id, '');
		const req = await db.query.teamUps.findFirst({ where: eq(teamUps.fromUserId, mika.id) });
		await respondToTeamUp(db, req!.id, lucia.id, true);

		expect(await updatesFor(mika.id)).toEqual([['teamup_accepted', 'Lucia', 'Mika & Lucia']]);
		expect(await updatesFor(lucia.id)).toEqual([]); // the person who accepted already knows
	});

	it('join request accepted → the requester is told', async () => {
		const j = await jam();
		const [owner, bob] = [await user('Owner'), await user('Bob')];
		const t = await createTeam(db, j, owner.id, team('Night Owls'));
		await requestToJoin(db, t.id, bob.id, '');
		const req = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, bob.id) });
		await respondToRequest(db, req!.id, owner.id, true);
		expect(await updatesFor(bob.id)).toEqual([['request_accepted', 'Owner', 'Night Owls']]);
	});

	it('invite accepted → the team owner is told', async () => {
		const j = await jam();
		const [owner, eve] = [await user('Owner'), await user('Eve')];
		const t = await createTeam(db, j, owner.id, team('Coffee & Pixels'));
		await inviteUser(db, t.id, owner.id, eve.id, '');
		const inv = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, eve.id) });
		await respondToRequest(db, inv!.id, eve.id, true);
		expect(await updatesFor(owner.id)).toEqual([['invite_accepted', 'Eve', 'Coffee & Pixels']]);
	});

	it('declines create no update', async () => {
		const j = await jam();
		const [a, b] = [await user('A'), await user('B')];
		await sendTeamUp(db, j, a.id, b.id, '');
		const req = await db.query.teamUps.findFirst({ where: eq(teamUps.fromUserId, a.id) });
		await respondToTeamUp(db, req!.id, b.id, false);
		expect(await updatesFor(a.id)).toEqual([]);
	});

	it('unread updates count towards the badge until the inbox is opened', async () => {
		const j = await jam();
		const [a, b] = [await user('A'), await user('B')];
		await sendTeamUp(db, j, a.id, b.id, '');
		const req = await db.query.teamUps.findFirst({ where: eq(teamUps.fromUserId, a.id) });
		await respondToTeamUp(db, req!.id, b.id, true);

		expect(await pendingActionCount(db, a.id)).toBe(1);
		expect(await pendingActionCount(db, a.id, { includeUpdates: false })).toBe(0);
		await markUpdatesRead(db, a.id);
		expect(await pendingActionCount(db, a.id)).toBe(0);
		expect(await recentUpdates(db, a.id)).toHaveLength(1); // still listed, just read
	});

	it("shows the team's current name after a rename", async () => {
		const j = await jam();
		const [a, b] = [await user('A'), await user('B')];
		await sendTeamUp(db, j, a.id, b.id, '');
		const req = await db.query.teamUps.findFirst({ where: eq(teamUps.fromUserId, a.id) });
		const { team: t } = await respondToTeamUp(db, req!.id, b.id, true);
		await updateTeam(db, t!.id, a.id, {
			name: 'Cozy Crew',
			description: '',
			openRoles: [],
			status: 'open'
		});
		expect(await updatesFor(a.id)).toEqual([['teamup_accepted', 'B', 'Cozy Crew']]);
	});

	it('keeps the team name after the team is disbanded', async () => {
		const j = await jam();
		const [owner, bob] = [await user('Owner'), await user('Bob')];
		const t = await createTeam(db, j, owner.id, team('Gone Soon'));
		await requestToJoin(db, t.id, bob.id, '');
		const req = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, bob.id) });
		await respondToRequest(db, req!.id, owner.id, true);
		await disbandTeam(db, t.id, owner.id);

		const [u] = await recentUpdates(db, bob.id);
		expect(u).toMatchObject({ teamId: null, teamName: 'Gone Soon' });
		expect(
			await db.select().from(notifications).where(eq(notifications.userId, bob.id))
		).toHaveLength(1);
	});
});
