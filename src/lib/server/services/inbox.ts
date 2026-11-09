import { and, desc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { alias } from 'drizzle-orm/sqlite-core';
import { jams, notifications, teamRequests, teamUps, teams, users } from '#lib/server/db/schema.ts';

// Items waiting for *this* user's decision (invites and team-ups addressed to them, join
// requests sent to teams they own) plus unread updates, unless `includeUpdates` is false.
export async function pendingActionCount(
	db: Db,
	userId: string,
	{ includeUpdates = true } = {}
): Promise<number> {
	const [invites] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamRequests)
		.where(
			and(
				eq(teamRequests.userId, userId),
				eq(teamRequests.kind, 'invite'),
				eq(teamRequests.status, 'pending')
			)
		);
	const [requests] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamRequests)
		.innerJoin(teams, eq(teams.id, teamRequests.teamId))
		.where(
			and(
				eq(teams.ownerId, userId),
				eq(teamRequests.kind, 'request'),
				eq(teamRequests.status, 'pending')
			)
		);
	const [ups] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamUps)
		.where(and(eq(teamUps.toUserId, userId), eq(teamUps.status, 'pending')));
	const unread = includeUpdates ? await unreadUpdateCount(db, userId) : 0;
	return (invites?.n ?? 0) + (requests?.n ?? 0) + (ups?.n ?? 0) + unread;
}

export async function inboxItems(db: Db, userId: string) {
	const rows = await db
		.select({
			id: teamRequests.id,
			kind: teamRequests.kind,
			message: teamRequests.message,
			createdAt: teamRequests.createdAt,
			team: { id: teams.id, name: teams.name, ownerId: teams.ownerId },
			jam: { slug: jams.slug, title: jams.title },
			user: {
				id: users.id,
				username: users.username,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				roles: users.roles
			}
		})
		.from(teamRequests)
		.innerJoin(teams, eq(teams.id, teamRequests.teamId))
		.innerJoin(jams, eq(jams.id, teams.jamId))
		.innerJoin(users, eq(users.id, teamRequests.userId))
		.where(
			and(
				eq(teamRequests.status, 'pending'),
				or(eq(teamRequests.userId, userId), eq(teams.ownerId, userId))
			)
		)
		.orderBy(desc(teamRequests.createdAt));

	// Incoming = waiting for my decision; outgoing = waiting for someone else.
	const incoming = rows.filter(
		(r) =>
			(r.kind === 'invite' && r.user.id === userId) ||
			(r.kind === 'request' && r.team.ownerId === userId)
	);
	const outgoing = rows.filter((r) => !incoming.includes(r));
	const teamUpRows = await teamUpItems(db, userId);
	return {
		incoming,
		outgoing,
		teamUpsIn: teamUpRows.filter((t) => t.incoming),
		teamUpsOut: teamUpRows.filter((t) => !t.incoming)
	};
}

const sender = alias(users, 'sender');
const recipient = alias(users, 'recipient');

/** Pending team-ups the user sent or received, with the other person's details. */
async function teamUpItems(db: Db, userId: string) {
	const rows = await db
		.select({
			id: teamUps.id,
			message: teamUps.message,
			createdAt: teamUps.createdAt,
			jam: { slug: jams.slug, title: jams.title },
			from: {
				id: sender.id,
				username: sender.username,
				displayName: sender.displayName,
				avatarUrl: sender.avatarUrl,
				roles: sender.roles
			},
			to: {
				id: recipient.id,
				username: recipient.username,
				displayName: recipient.displayName,
				avatarUrl: recipient.avatarUrl,
				roles: recipient.roles
			}
		})
		.from(teamUps)
		.innerJoin(jams, eq(jams.id, teamUps.jamId))
		.innerJoin(sender, eq(sender.id, teamUps.fromUserId))
		.innerJoin(recipient, eq(recipient.id, teamUps.toUserId))
		.where(
			and(
				eq(teamUps.status, 'pending'),
				or(eq(teamUps.fromUserId, userId), eq(teamUps.toUserId, userId))
			)
		)
		.orderBy(desc(teamUps.createdAt));
	return rows.map((r) => ({
		...r,
		incoming: r.to.id === userId,
		other: r.to.id === userId ? r.from : r.to
	}));
}

// ---------------------------------------------------------------------------
// Updates ("Lucia accepted your team-up")
// ---------------------------------------------------------------------------

const UPDATES_MAX_AGE_MS = 30 * 86_400_000;

export async function unreadUpdateCount(db: Db, userId: string) {
	const [row] = await db
		.select({ n: sql<number>`count(*)` })
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				isNull(notifications.readAt),
				gt(notifications.createdAt, new Date(Date.now() - UPDATES_MAX_AGE_MS))
			)
		);
	return row?.n ?? 0;
}

/** The last 30 days of updates, newest first. */
export async function recentUpdates(db: Db, userId: string, limit = 20, offset = 0) {
	return db
		.select({
			id: notifications.id,
			kind: notifications.kind,
			teamId: notifications.teamId,
			// The team's current name (it may have been renamed); the stored one if it's gone.
			teamName: sql<string>`coalesce("teams"."name", "notifications"."team_name")`,
			readAt: notifications.readAt,
			createdAt: notifications.createdAt,
			jam: { slug: jams.slug, title: jams.title },
			actor: {
				username: users.username,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl
			}
		})
		.from(notifications)
		.innerJoin(users, eq(users.id, notifications.actorId))
		.innerJoin(jams, eq(jams.id, notifications.jamId))
		.leftJoin(teams, eq(teams.id, notifications.teamId))
		.where(
			and(
				eq(notifications.userId, userId),
				gt(notifications.createdAt, new Date(Date.now() - UPDATES_MAX_AGE_MS))
			)
		)
		.orderBy(desc(notifications.createdAt), desc(notifications.id))
		.limit(limit)
		.offset(offset);
}

export async function markUpdatesRead(db: Db, userId: string, ids: string[]) {
	if (!ids.length) return;
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.userId, userId),
				inArray(notifications.id, ids),
				isNull(notifications.readAt)
			)
		);
}
