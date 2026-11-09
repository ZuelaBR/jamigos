import { and, desc, eq, or, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { jams, teamRequests, teams, users } from '#lib/server/db/schema.ts';

// Items waiting for *this* user's decision: invites addressed to them,
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
	return (invites?.n ?? 0) + (requests?.n ?? 0);
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
	return { incoming, outgoing };
}
