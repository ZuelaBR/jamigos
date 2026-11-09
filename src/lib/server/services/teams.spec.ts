import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { and, eq } from 'drizzle-orm';
import { getDb, type Db } from '../db/index.ts';
import { jams, lfgPosts, teamMembers, teamRequests, teams, users, type Jam } from '../db/schema.ts';
import {
	ServiceError,
	createTeam,
	inviteUser,
	leaveTeam,
	requestToJoin,
	respondToRequest,
	upsertLfgPost
} from './teams.ts';

// Real (in-memory) D1 via wrangler, with the generated migrations applied.
let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let db: Db;

beforeAll(async () => {
	proxy = await getPlatformProxy<Env>({ persist: false });
	for (const file of readdirSync('drizzle')
		.filter((f) => f.endsWith('.sql'))
		.sort()) {
		for (const stmt of readFileSync(`drizzle/${file}`, 'utf8').split('--> statement-breakpoint')) {
			if (stmt.trim()) await proxy.env.DB.prepare(stmt).run();
		}
	}
	db = getDb(proxy.env.DB);
});

afterAll(() => proxy?.dispose());

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
