import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import { createTestDb } from '../testing/d1.ts';
import {
	jams,
	lfgPosts,
	notifications,
	teamMembers,
	teamRequests,
	teamUps,
	teams,
	users,
	type Jam
} from '../db/schema.ts';
import {
	ServiceError,
	cancelRequest,
	cancelTeamUp,
	createTeam,
	defaultTeamName,
	inviteUser,
	leaveTeam,
	requestToJoin,
	respondToRequest,
	respondToTeamUp,
	sendTeamUp,
	upsertLfgPost,
	transferOwnership
} from './teams.ts';

// Real (in-memory) D1 via wrangler, with the generated migrations applied.
let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});

afterAll(() => dispose?.());

let jam: Jam;
let otherJam: Jam;
let n = 0;

async function makeUser(name: string) {
	n++;
	const [u] = await db
		.insert(users)
		.values({
			itchId: n,
			username: `${name}${n}`,
			itchUrl: `https://${name}.itch.io`,
			onboarded: true
		})
		.returning();
	return u;
}

async function makeJam(slug: string) {
	const [j] = await db
		.insert(jams)
		.values({ slug: `${slug}-${++n}`, title: slug, url: 'https://itch.io/jam/x' })
		.returning();
	return j;
}

beforeEach(async () => {
	jam = await makeJam('jam');
	otherJam = await makeJam('other');
});

const team = (name: string) => ({ name, description: '', openRoles: [] as never[] });

describe('team rules', () => {
	it('accepting a request joins the team and tidies up the jam activity', async () => {
		const owner = await makeUser('owner');
		const owner2 = await makeUser('owner');
		const bob = await makeUser('bob');
		const t1 = await createTeam(db, jam, owner.id, team('A'));
		const t2 = await createTeam(db, jam, owner2.id, team('B'));
		const tOther = await createTeam(db, otherJam, owner.id, team('C'));

		await upsertLfgPost(db, jam, bob.id, { message: 'hi', roles: ['code'] });
		await requestToJoin(db, t1.id, bob.id, '');
		await requestToJoin(db, t2.id, bob.id, '');
		await requestToJoin(db, tOther.id, bob.id, '');

		const req = await db.query.teamRequests.findFirst({
			where: and(eq(teamRequests.teamId, t1.id), eq(teamRequests.userId, bob.id))
		});
		await respondToRequest(db, req!.id, owner.id, true);

		const statuses = await db
			.select({ teamId: teamRequests.teamId, status: teamRequests.status })
			.from(teamRequests)
			.where(eq(teamRequests.userId, bob.id));
		const byTeam = Object.fromEntries(statuses.map((s) => [s.teamId, s.status]));
		expect(byTeam[t1.id]).toBe('accepted');
		expect(byTeam[t2.id]).toBe('cancelled'); // same jam
		expect(byTeam[tOther.id]).toBe('pending'); // different jam is untouched

		const post = await db.query.lfgPosts.findFirst({
			where: and(eq(lfgPosts.jamId, jam.id), eq(lfgPosts.authorId, bob.id))
		});
		expect(post?.status).toBe('closed');

		const membership = await db.select().from(teamMembers).where(eq(teamMembers.userId, bob.id));
		expect(membership.map((m) => m.teamId)).toEqual([t1.id]);
	});

	it('only the owner can accept requests, and only the invitee can accept invites', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const eve = await makeUser('eve');
		const t = await createTeam(db, jam, owner.id, team('A'));

		await requestToJoin(db, t.id, bob.id, '');
		const req = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, bob.id) });
		await expect(respondToRequest(db, req!.id, bob.id, true)).rejects.toThrow(ServiceError);
		await expect(respondToRequest(db, req!.id, eve.id, true)).rejects.toThrow(ServiceError);

		await inviteUser(db, t.id, owner.id, eve.id, '');
		const inv = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, eve.id) });
		await expect(respondToRequest(db, inv!.id, owner.id, true)).rejects.toThrow(ServiceError);
		await respondToRequest(db, inv!.id, eve.id, true);
		expect((await db.select().from(teamMembers).where(eq(teamMembers.teamId, t.id))).length).toBe(
			2
		);
	});

	it('a user can be on only one team per jam', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		const ta = await createTeam(db, jam, a.id, team('A'));
		await createTeam(db, jam, b.id, team('B'));

		await expect(createTeam(db, jam, a.id, team('A2'))).rejects.toThrow(/already on a team/);
		await expect(requestToJoin(db, ta.id, b.id, '')).rejects.toThrow(/already on a team/);
		await expect(inviteUser(db, ta.id, a.id, b.id, '')).rejects.toThrow(/already on a team/);
		await expect(upsertLfgPost(db, jam, a.id, { message: '', roles: ['art'] })).rejects.toThrow(
			/already on a team/
		);
		// ...but a different jam is fine.
		await expect(createTeam(db, otherJam, a.id, team('A3'))).resolves.toBeTruthy();
	});

	it('prevents duplicate pending requests and joining full teams', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const t = await createTeam(db, jam, owner.id, team('A'));
		await requestToJoin(db, t.id, bob.id, '');
		await expect(requestToJoin(db, t.id, bob.id, '')).rejects.toThrow(/pending request/);

		await db.update(teams).set({ status: 'full' }).where(eq(teams.id, t.id));
		const carol = await makeUser('carol');
		await expect(requestToJoin(db, t.id, carol.id, '')).rejects.toThrow(/not looking/);
	});

	it('owners cannot abandon members; the last member leaving disbands the team', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const t = await createTeam(db, jam, owner.id, team('A'));
		await inviteUser(db, t.id, owner.id, bob.id, '');
		const inv = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, bob.id) });
		await respondToRequest(db, inv!.id, bob.id, true);

		await expect(leaveTeam(db, t.id, owner.id)).rejects.toThrow(/ownership/);
		await expect(leaveTeam(db, t.id, bob.id)).resolves.toEqual({ disbanded: false });
		await expect(leaveTeam(db, t.id, owner.id)).resolves.toEqual({ disbanded: true });
		expect(await db.query.teams.findFirst({ where: eq(teams.id, t.id) })).toBeUndefined();
	});
});

describe('team-ups (two solo jammers forming a team)', () => {
	const teamUpBetween = (fromId: string, toId: string) =>
		db.query.teamUps.findFirst({
			where: and(eq(teamUps.fromUserId, fromId), eq(teamUps.toUserId, toId))
		});
	const membersOf = async (teamId: string) =>
		(await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId)))
			.map((m) => m.userId)
			.sort();

	it('accepting creates a team for both, owned by the sender, and tidies up', async () => {
		const mika = await makeUser('mika');
		const devon = await makeUser('devon');
		const sora = await makeUser('sora');
		const owner = await makeUser('owner');
		await upsertLfgPost(db, jam, mika.id, { message: '', roles: ['art'] });
		await upsertLfgPost(db, jam, devon.id, { message: '', roles: ['code'] });
		const other = await createTeam(db, jam, owner.id, team('Other'));
		await requestToJoin(db, other.id, devon.id, ''); // devon's other options...
		await sendTeamUp(db, jam, sora.id, devon.id, ''); // ...for this jam
		await sendTeamUp(db, otherJam, sora.id, devon.id, ''); // a different jam: untouched

		await sendTeamUp(db, jam, mika.id, devon.id, 'Cozy game?');
		const req = await teamUpBetween(mika.id, devon.id);
		const { team: formed } = await respondToTeamUp(db, req!.id, devon.id, true);

		expect(formed).toMatchObject({
			ownerId: mika.id,
			name: `${mika.username} & ${devon.username}`,
			status: 'open'
		});
		expect(await membersOf(formed!.id)).toEqual([mika.id, devon.id].sort());
		expect((await teamUpBetween(mika.id, devon.id))?.status).toBe('accepted');

		const posts = await db.select().from(lfgPosts).where(eq(lfgPosts.jamId, jam.id));
		expect(posts.map((p) => p.status)).toEqual(['closed', 'closed']);
		const devonRequest = await db.query.teamRequests.findFirst({
			where: eq(teamRequests.userId, devon.id)
		});
		expect(devonRequest?.status).toBe('cancelled');
		const soraUps = await db.select().from(teamUps).where(eq(teamUps.fromUserId, sora.id));
		expect(Object.fromEntries(soraUps.map((u) => [u.jamId, u.status]))).toEqual({
			[jam.id]: 'cancelled',
			[otherJam.id]: 'pending'
		});
	});

	it('asking someone who already asked you forms the team straight away', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		await sendTeamUp(db, jam, a.id, b.id, '');
		const { formed } = await sendTeamUp(db, jam, b.id, a.id, '');
		expect(formed?.ownerId).toBe(a.id); // the person who asked first
		expect(await membersOf(formed!.id)).toEqual([a.id, b.id].sort());
	});

	it('only the recipient can answer, and only the sender can cancel', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		const eve = await makeUser('eve');
		await sendTeamUp(db, jam, a.id, b.id, '');
		const req = (await teamUpBetween(a.id, b.id))!;
		await expect(respondToTeamUp(db, req.id, a.id, true)).rejects.toThrow(ServiceError);
		await expect(respondToTeamUp(db, req.id, eve.id, true)).rejects.toThrow(ServiceError);
		await expect(cancelTeamUp(db, req.id, b.id)).rejects.toThrow(ServiceError);
		await cancelTeamUp(db, req.id, a.id);
		expect((await teamUpBetween(a.id, b.id))?.status).toBe('cancelled');
		await expect(respondToTeamUp(db, req.id, b.id, true)).rejects.toThrow(/no longer pending/);
	});

	it('declining creates no team', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		await sendTeamUp(db, jam, a.id, b.id, '');
		const req = (await teamUpBetween(a.id, b.id))!;
		expect(await respondToTeamUp(db, req.id, b.id, false)).toEqual({ team: null });
		expect((await teamUpBetween(a.id, b.id))?.status).toBe('declined');
		expect(await db.select().from(teamMembers).where(eq(teamMembers.jamId, jam.id))).toHaveLength(
			0
		);
	});

	it('is blocked for people already on a team, and against duplicates', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		const c = await makeUser('c');
		await createTeam(db, jam, c.id, team('C'));
		await expect(sendTeamUp(db, jam, a.id, a.id, '')).rejects.toThrow(/yourself/);
		await expect(sendTeamUp(db, jam, c.id, a.id, '')).rejects.toThrow(/already on a team/);
		await expect(sendTeamUp(db, jam, a.id, c.id, '')).rejects.toThrow(/already joined a team/);
		await sendTeamUp(db, jam, a.id, b.id, '');
		await expect(sendTeamUp(db, jam, a.id, b.id, '')).rejects.toThrow(/already asked/);
	});

	it('joining another team cancels pending team-ups, and a stale accept fails cleanly', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		const owner = await makeUser('owner');
		await sendTeamUp(db, jam, a.id, b.id, '');
		const req = (await teamUpBetween(a.id, b.id))!;
		const t = await createTeam(db, jam, owner.id, team('T'));
		await inviteUser(db, t.id, owner.id, a.id, '');
		const inv = await db.query.teamRequests.findFirst({ where: eq(teamRequests.userId, a.id) });
		await respondToRequest(db, inv!.id, a.id, true); // a joins someone else's team

		expect((await teamUpBetween(a.id, b.id))?.status).toBe('cancelled');
		await expect(respondToTeamUp(db, req.id, b.id, true)).rejects.toThrow(/no longer pending/);
	});

	it('builds a default name that fits the 60-character limit', () => {
		expect(
			defaultTeamName(
				{ username: 'mika', displayName: 'Mika' },
				{ username: 'devon', displayName: null }
			)
		).toBe('Mika & devon');
		const long = { username: 'x', displayName: 'A'.repeat(50) };
		expect(defaultTeamName(long, long).length).toBeLessThanOrEqual(60);
	});
});

// Pause immediately before the atomic write to reproduce a withdrawal after the reads.
function beforeBatch(run: () => Promise<void>): Db {
	return new Proxy(db, {
		get(target, property) {
			if (property === 'batch')
				return async (...args: Parameters<Db['batch']>) => {
					await run();
					return target.batch(...args);
				};
			return Reflect.get(target, property);
		}
	});
}

describe('withdrawal racing acceptance', () => {
	it('does not join or notify after a join request is withdrawn', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const t = await createTeam(db, jam, owner.id, team('A'));
		await requestToJoin(db, t.id, bob.id, '');
		const req = (await db.query.teamRequests.findFirst({
			where: eq(teamRequests.userId, bob.id)
		}))!;
		const racingDb = beforeBatch(() => cancelRequest(db, req.id, bob.id));
		await expect(respondToRequest(racingDb, req.id, owner.id, true)).rejects.toThrow(
			/no longer pending/
		);
		expect(await db.select().from(teamMembers).where(eq(teamMembers.userId, bob.id))).toHaveLength(
			0
		);
		expect(
			(await db.query.teamRequests.findFirst({ where: eq(teamRequests.id, req.id) }))?.status
		).toBe('cancelled');
		expect(
			await db.query.notifications.findMany({ where: eq(notifications.userId, bob.id) })
		).toHaveLength(0);
	});

	it('rolls back team creation after a team-up is withdrawn', async () => {
		const a = await makeUser('a');
		const b = await makeUser('b');
		await sendTeamUp(db, jam, a.id, b.id, '');
		const req = (await db.query.teamUps.findFirst({ where: eq(teamUps.fromUserId, a.id) }))!;
		const racingDb = beforeBatch(() => cancelTeamUp(db, req.id, a.id));
		await expect(respondToTeamUp(racingDb, req.id, b.id, true)).rejects.toThrow(
			/no longer pending/
		);
		expect(await db.select().from(teams).where(eq(teams.jamId, jam.id))).toHaveLength(0);
		expect(await db.select().from(teamMembers).where(eq(teamMembers.jamId, jam.id))).toHaveLength(
			0
		);
		expect((await db.query.teamUps.findFirst({ where: eq(teamUps.id, req.id) }))?.status).toBe(
			'cancelled'
		);
	});
});

describe('unlimited team size', () => {
	it('allows requests, invites and acceptance beyond eight members', async () => {
		const owner = await makeUser('owner');
		const t = await createTeam(db, jam, owner.id, team('Large team'));
		for (let i = 0; i < 9; i++) {
			const member = await makeUser('member');
			if (i % 2) await inviteUser(db, t.id, owner.id, member.id, '');
			else await requestToJoin(db, t.id, member.id, '');
			const req = (await db.query.teamRequests.findFirst({
				where: eq(teamRequests.userId, member.id)
			}))!;
			await respondToRequest(db, req.id, i % 2 ? member.id : owner.id, true);
		}
		expect(await db.select().from(teamMembers).where(eq(teamMembers.teamId, t.id))).toHaveLength(
			10
		);
	});
});

describe('ownership transfer', () => {
	it('cannot leave a nonmember owning the team when transfer races departure', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const t = await createTeam(db, jam, owner.id, team('A'));
		await inviteUser(db, t.id, owner.id, bob.id, '');
		const req = (await db.query.teamRequests.findFirst({
			where: eq(teamRequests.userId, bob.id)
		}))!;
		await respondToRequest(db, req.id, bob.id, true);
		await Promise.allSettled([
			transferOwnership(db, t.id, owner.id, bob.id),
			leaveTeam(db, t.id, bob.id)
		]);
		const current = (await db.query.teams.findFirst({ where: eq(teams.id, t.id) }))!;
		expect(
			await db.query.teamMembers.findFirst({
				where: and(eq(teamMembers.teamId, t.id), eq(teamMembers.userId, current.ownerId))
			})
		).toBeDefined();
	});

	it('rejects nonmembers and a former owner', async () => {
		const owner = await makeUser('owner');
		const bob = await makeUser('bob');
		const t = await createTeam(db, jam, owner.id, team('A'));
		await expect(transferOwnership(db, t.id, owner.id, bob.id)).rejects.toThrow(ServiceError);
		await inviteUser(db, t.id, owner.id, bob.id, '');
		const req = (await db.query.teamRequests.findFirst({
			where: eq(teamRequests.userId, bob.id)
		}))!;
		await respondToRequest(db, req.id, bob.id, true);
		await transferOwnership(db, t.id, owner.id, bob.id);
		await expect(transferOwnership(db, t.id, owner.id, owner.id)).rejects.toThrow(ServiceError);
	});
});
