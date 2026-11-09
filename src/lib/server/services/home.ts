import { and, desc, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { jams, lfgPosts, teams } from '#lib/server/db/schema.ts';
import { activity, lookingCount, notEnded, teamCount, titleMatches } from './jams.ts';

const jamCardFields = {
	id: jams.id,
	slug: jams.slug,
	title: jams.title,
	hostName: jams.hostName,
	coverUrl: jams.coverUrl,
	startsAt: jams.startsAt,
	endsAt: jams.endsAt,
	joinedCount: jams.joinedCount,
	lookingCount,
	teamCount
};

/** Jams where people are actually teaming up on Jamigos, busiest first. */
export async function activeJams(db: Db, limit: number) {
	return db
		.select(jamCardFields)
		.from(jams)
		.where(and(notEnded(new Date()), gt(activity, 0)))
		.orderBy(desc(activity), desc(jams.joinedCount))
		.limit(limit);
}

/**
 * Popular jams starting within the next `days` days. Sorted by itch.io popularity rather than
 * date, so big jams people plan ahead for win over tiny ones starting in an hour.
 */
export async function upcomingJams(db: Db, limit: number, days = 30) {
	const now = new Date();
	const until = new Date(now.getTime() + days * 86_400_000);
	return db
		.select(jamCardFields)
		.from(jams)
		.where(and(gt(jams.startsAt, now), sql`${jams.startsAt} <= ${until.getTime()}`))
		.orderBy(desc(activity), desc(jams.joinedCount))
		.limit(limit);
}

/** Headline numbers for social proof ("12 jammers looking across 3 jams"). */
export async function stats(db: Db) {
	const now = new Date();
	const [row] = await db
		.select({
			looking: sql<number>`count(*)`,
			jams: sql<number>`count(distinct ${lfgPosts.jamId})`
		})
		.from(lfgPosts)
		.innerJoin(jams, eq(jams.id, lfgPosts.jamId))
		.where(and(eq(lfgPosts.status, 'open'), notEnded(now)));
	const [t] = await db
		.select({ teams: sql<number>`count(*)` })
		.from(teams)
		.innerJoin(jams, eq(jams.id, teams.jamId))
		.where(and(eq(teams.status, 'open'), notEnded(now)));
	return { looking: row?.looking ?? 0, jams: row?.jams ?? 0, openTeams: t?.teams ?? 0 };
}

/** Typeahead search for the home page. Busy and popular jams first. */
export async function searchJams(db: Db, q: string, limit = 8) {
	return db
		.select({
			slug: jams.slug,
			title: jams.title,
			coverUrl: jams.coverUrl,
			startsAt: jams.startsAt,
			endsAt: jams.endsAt,
			lookingCount,
			teamCount
		})
		.from(jams)
		.where(and(notEnded(new Date()), titleMatches(q)))
		.orderBy(desc(activity), desc(jams.joinedCount))
		.limit(limit);
}
