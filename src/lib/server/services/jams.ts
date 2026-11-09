import { and, asc, desc, eq, gt, isNull, like, lte, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { jams } from '#lib/server/db/schema.ts';
import type { ParsedJam } from '#lib/jams/parse.ts';

const toDate = (iso: string | null) => (iso ? new Date(iso) : null);

/** Insert or refresh jams by slug. `source` is only set on insert, so manual jams stay manual. */
export async function upsertJams(db: Db, items: ParsedJam[], source: 'sync' | 'manual' = 'sync') {
	if (!items.length) return 0;
	const now = new Date();
	const statements = items.map((j) => {
		const fields = {
			title: j.title,
			url: j.url,
			hostName: j.hostName,
			hostUrl: j.hostUrl,
			coverUrl: j.coverUrl,
			startsAt: toDate(j.startsAt),
			endsAt: toDate(j.endsAt),
			joinedCount: j.joinedCount,
			lastSeenAt: now,
			updatedAt: now
		};
		return db
			.insert(jams)
			.values({ slug: j.slug, source, ...fields })
			.onConflictDoUpdate({
				target: jams.slug,
				set: {
					...fields,
					// Listing pages don't always include every field; keep what we already know.
					startsAt: sql`coalesce(excluded.starts_at, ${jams.startsAt})`,
					endsAt: sql`coalesce(excluded.ends_at, ${jams.endsAt})`,
					coverUrl: sql`coalesce(excluded.cover_url, ${jams.coverUrl})`
				}
			});
	});
	// D1 batches run as a single implicit transaction.
	await db.batch(statements as [(typeof statements)[0], ...typeof statements]);
	return items.length;
}

export async function getJamBySlug(db: Db, slug: string) {
	return db.query.jams.findFirst({ where: eq(jams.slug, slug) });
}

export type JamTab = 'running' | 'upcoming';
export type JamSort = 'soon' | 'popular' | 'active';

// Correlated subqueries. Column names must be qualified explicitly: drizzle renders `${jams.id}`
// as a bare "id", which inside the subquery resolves to the *inner* table's id (always 0 rows).
export const lookingCount = sql<number>`(select count(*) from "lfg_posts" lp where lp."jam_id" = "jams"."id" and lp."status" = 'open')`;
export const teamCount = sql<number>`(select count(*) from "teams" t where t."jam_id" = "jams"."id")`;

export const notEnded = (now: Date) => or(isNull(jams.endsAt), gt(jams.endsAt, now))!;
export const titleMatches = (q: string) => like(jams.title, `%${q.replace(/[%_]/g, '')}%`);
/** Jamigos activity: people looking + teams. */
export const activity = sql<number>`${lookingCount} + ${teamCount}`;

export async function listJams(
	db: Db,
	opts: { tab: JamTab; sort: JamSort; q?: string; limit: number; offset: number }
) {
	const now = new Date();
	const filters: SQL[] = [];
	if (opts.q) {
		// Searching covers every jam that hasn't ended, whichever tab is selected:
		// people search for "their" jam without knowing if it has started yet.
		filters.push(notEnded(now), titleMatches(opts.q));
	} else if (opts.tab === 'running') {
		filters.push(or(isNull(jams.startsAt), lte(jams.startsAt, now))!, gt(jams.endsAt, now));
	} else {
		filters.push(gt(jams.startsAt, now));
	}

	const order =
		opts.sort === 'popular'
			? [desc(jams.joinedCount)]
			: opts.sort === 'active'
				? [desc(activity), desc(jams.joinedCount)]
				: opts.tab === 'running'
					? [asc(jams.endsAt)]
					: [asc(jams.startsAt)];

	return db
		.select({
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
		})
		.from(jams)
		.where(and(...filters))
		.orderBy(...order)
		.limit(opts.limit + 1) // one extra row tells us whether there is a next page
		.offset(opts.offset);
}

export type JamListItem = Awaited<ReturnType<typeof listJams>>[number];
