import { afterAll, beforeAll, expect, it } from 'vitest';
import type { Db } from '../db/index.ts';
import { jams, lfgPosts, teams, users } from '../db/schema.ts';
import { createTestDb } from '../testing/d1.ts';
import { stats } from './home.ts';

let db: Db;
let dispose: () => Promise<void>;
beforeAll(async () => {
	({ db, dispose } = await createTestDb());
});
afterAll(() => dispose?.());

it('counts all available jams, recruiting teams, and distinct people while excluding ended activity', async () => {
	const now = new Date('2026-11-09T12:00:00Z');
	const day = 86400000;
	const after = (days: number) => new Date(now.getTime() + days * day);
	expect(await stats(db, now)).toEqual({
		runningJams: 0,
		upcomingJams: 0,
		openTeams: 0,
		looking: 0
	});
	const [running, upcoming, quiet, ended] = await db
		.insert(jams)
		.values([
			{
				slug: 'running',
				title: 'Running',
				url: 'https://itch.io/jam/running',
				startsAt: now,
				endsAt: after(1)
			},
			{
				slug: 'upcoming',
				title: 'Upcoming',
				url: 'https://itch.io/jam/upcoming',
				startsAt: after(1),
				endsAt: after(2)
			},
			{
				slug: 'quiet',
				title: 'No activity yet',
				url: 'https://itch.io/jam/quiet',
				startsAt: after(2)
			},
			{
				slug: 'ended',
				title: 'Ended',
				url: 'https://itch.io/jam/ended',
				startsAt: after(-2),
				endsAt: now
			},
			{ slug: 'unknown', title: 'Unknown dates', url: 'https://itch.io/jam/unknown' }
		])
		.returning();
	const people = await db
		.insert(users)
		.values(
			Array.from({ length: 8 }, (_, i) => ({
				itchId: i + 1,
				username: `user${i}`,
				itchUrl: `https://user${i}.itch.io`
			}))
		)
		.returning();
	await db.insert(lfgPosts).values([
		{ jamId: running.id, authorId: people[0].id },
		{ jamId: upcoming.id, authorId: people[0].id },
		{ jamId: upcoming.id, authorId: people[1].id },
		{ jamId: ended.id, authorId: people[2].id },
		{ jamId: running.id, authorId: people[3].id, status: 'closed' }
	]);
	await db.insert(teams).values([
		{ jamId: running.id, ownerId: people[4].id, name: 'Recruiting' },
		{ jamId: upcoming.id, ownerId: people[5].id, name: 'Closed', status: 'full' },
		{ jamId: ended.id, ownerId: people[6].id, name: 'Old team' },
		{ jamId: quiet.id, ownerId: people[7].id, name: 'Upcoming team' }
	]);
	expect(await stats(db, now)).toEqual({
		runningJams: 1,
		upcomingJams: 2,
		openTeams: 2,
		looking: 2
	});
});
