import { and, desc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { alias } from 'drizzle-orm/sqlite-core';
import { jams, teamRequests, teamUps, teams, users } from '#lib/server/db/schema.ts';

// Items waiting for *this* user's decision: invites and team-ups addressed to them,
// and join requests sent to teams they own.
export async function pendingActionCount(db: Db, userId: string): Promise<number> {
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
	return (invites?.n ?? 0) + (requests?.n ?? 0) + (ups?.n ?? 0);
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
