import { and, desc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import {
	lfgPosts,
	notifications,
	teamMembers,
	teamRequests,
	teamUps,
	teams,
	users,
	type Jam,
	type RequestKind,
	type Team
} from '#lib/server/db/schema.ts';
import type { Role } from '#lib/profile.ts';

/** An expected, user-facing failure (shown as a toast / form error). */
export class ServiceError extends Error {}

const MAX_PENDING_OUTGOING = 20;
export const MAX_TEAM_SIZE = 8;

const publicUser = {
	id: users.id,
	username: users.username,
	displayName: users.displayName,
	avatarUrl: users.avatarUrl,
	roles: users.roles,
	tools: users.tools,
	experience: users.experience,
	timezone: users.timezone,
	bio: users.bio
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function membershipForJam(db: Db, jamId: string, userId: string) {
	const [row] = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(and(eq(teamMembers.jamId, jamId), eq(teamMembers.userId, userId)));
	return row?.teamId ?? null;
}

export async function getTeam(db: Db, teamId: string) {
	return db.query.teams.findFirst({ where: eq(teams.id, teamId) });
}

export async function teamMembersOf(db: Db, teamIds: string[]) {
	if (!teamIds.length) return [];
	return db
		.select({ teamId: teamMembers.teamId, ...publicUser })
		.from(teamMembers)
		.innerJoin(users, eq(users.id, teamMembers.userId))
		.where(inArray(teamMembers.teamId, teamIds))
		.orderBy(teamMembers.joinedAt);
}

export async function getBoard(db: Db, jamId: string, viewerId: string | null) {
	const [posts, teamRows] = await Promise.all([
		db
			.select({
				id: lfgPosts.id,
				message: lfgPosts.message,
				roles: lfgPosts.roles,
				updatedAt: lfgPosts.updatedAt,
				// Contact fields are stripped for signed-out visitors by the page load.
				user: { ...publicUser, contactDiscord: users.contactDiscord, itchUrl: users.itchUrl }
			})
			.from(lfgPosts)
			.innerJoin(users, eq(users.id, lfgPosts.authorId))
			.where(and(eq(lfgPosts.jamId, jamId), eq(lfgPosts.status, 'open')))
			.orderBy(desc(lfgPosts.updatedAt)),
		db.select().from(teams).where(eq(teams.jamId, jamId)).orderBy(desc(teams.createdAt))
	]);

	const members = await teamMembersOf(
		db,
		teamRows.map((t) => t.id)
	);

	let viewer: {
		myTeamId: string | null;
		isOwner: boolean;
		myPost: (typeof posts)[number] | null;
		/** Join requests the viewer has sent, by team. */
		requested: { teamId: string; requestId: string }[];
		/** Invites the viewer's team has sent, by user. */
		invited: { userId: string; requestId: string }[];
		invitesToMe: { requestId: string; teamId: string }[];
		/** Team-ups the viewer has sent, by recipient. */
		teamUpsSent: { userId: string; teamUpId: string }[];
		/** Team-ups waiting for the viewer's answer. */
		teamUpsReceived: {
			teamUpId: string;
			message: string;
			from: { id: string; username: string; displayName: string | null };
		}[];
	} | null = null;

	if (viewerId) {
		const myTeamId = members.find((m) => m.id === viewerId)?.teamId ?? null;
		const myTeam = teamRows.find((t) => t.id === myTeamId);
		const pending = await db
			.select({
				id: teamRequests.id,
				teamId: teamRequests.teamId,
				userId: teamRequests.userId,
				kind: teamRequests.kind
			})
			.from(teamRequests)
			.innerJoin(teams, eq(teams.id, teamRequests.teamId))
			.where(and(eq(teams.jamId, jamId), eq(teamRequests.status, 'pending')));
		const teamUpRows = await db
			.select({
				id: teamUps.id,
				fromUserId: teamUps.fromUserId,
				toUserId: teamUps.toUserId,
				message: teamUps.message,
				fromUsername: users.username,
				fromDisplayName: users.displayName
			})
			.from(teamUps)
			.innerJoin(users, eq(users.id, teamUps.fromUserId))
			.where(
				and(
					eq(teamUps.jamId, jamId),
					eq(teamUps.status, 'pending'),
					or(eq(teamUps.fromUserId, viewerId), eq(teamUps.toUserId, viewerId))
				)
			);
		viewer = {
			myTeamId,
			isOwner: myTeam?.ownerId === viewerId,
			myPost: posts.find((p) => p.user.id === viewerId) ?? null,
			requested: pending
				.filter((r) => r.kind === 'request' && r.userId === viewerId)
				.map((r) => ({ teamId: r.teamId, requestId: r.id })),
			invited:
				myTeam?.ownerId === viewerId
					? pending
							.filter((r) => r.kind === 'invite' && r.teamId === myTeamId)
							.map((r) => ({ userId: r.userId, requestId: r.id }))
					: [],
			invitesToMe: pending
				.filter((r) => r.kind === 'invite' && r.userId === viewerId)
				.map((r) => ({ requestId: r.id, teamId: r.teamId })),
			teamUpsSent: teamUpRows
				.filter((t) => t.fromUserId === viewerId)
				.map((t) => ({ userId: t.toUserId, teamUpId: t.id })),
			teamUpsReceived: teamUpRows
				.filter((t) => t.toUserId === viewerId)
				.map((t) => ({
					teamUpId: t.id,
					message: t.message,
					from: { id: t.fromUserId, username: t.fromUsername, displayName: t.fromDisplayName }
				}))
		};
	}

	return {
		posts,
		teams: teamRows.map((t) => ({ ...t, members: members.filter((m) => m.teamId === t.id) })),
		viewer
	};
}

// ---------------------------------------------------------------------------
// LFG posts
// ---------------------------------------------------------------------------

export async function upsertLfgPost(
	db: Db,
	jam: Jam,
	userId: string,
	input: { message: string; roles: Role[] }
) {
	if (await membershipForJam(db, jam.id, userId))
		throw new ServiceError("You're already on a team for this jam.");
	const now = new Date();
	await db
		.insert(lfgPosts)
		.values({ jamId: jam.id, authorId: userId, ...input, status: 'open', updatedAt: now })
		.onConflictDoUpdate({
			target: [lfgPosts.jamId, lfgPosts.authorId],
			set: { ...input, status: 'open', updatedAt: now }
		});
}

export async function closeLfgPost(db: Db, jamId: string, userId: string) {
	await db
		.update(lfgPosts)
		.set({ status: 'closed', updatedAt: new Date() })
		.where(and(eq(lfgPosts.jamId, jamId), eq(lfgPosts.authorId, userId)));
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

/** Statements that make `userId` a member of `team`, and tidy up their other jam activity. */
function joinStatements(db: Db, team: Team, userId: string) {
	return [
		db.insert(teamMembers).values({ teamId: team.id, userId, jamId: team.jamId }),
		// Their LFG post is no longer needed.
		db
			.update(lfgPosts)
			.set({ status: 'closed', updatedAt: new Date() })
			.where(and(eq(lfgPosts.jamId, team.jamId), eq(lfgPosts.authorId, userId))),
		// Cancel any other pending invites/requests involving them for this jam.
		db
			.update(teamRequests)
			.set({ status: 'cancelled' })
			.where(
				and(
					eq(teamRequests.userId, userId),
					eq(teamRequests.status, 'pending'),
					inArray(
						teamRequests.teamId,
						db.select({ id: teams.id }).from(teams).where(eq(teams.jamId, team.jamId))
					)
				)
			),
		// ...and any pending "team up" requests they sent or received for this jam.
		db
			.update(teamUps)
			.set({ status: 'cancelled' })
			.where(
				and(
					eq(teamUps.jamId, team.jamId),
					eq(teamUps.status, 'pending'),
					or(eq(teamUps.fromUserId, userId), eq(teamUps.toUserId, userId))
				)
			)
	] as const;
}

function isUniqueViolation(err: unknown) {
	const msg = String((err as { cause?: unknown })?.cause ?? err);
	return /UNIQUE constraint failed/i.test(msg);
}

export async function createTeam(
	db: Db,
	jam: Jam,
	ownerId: string,
	input: { name: string; description: string; openRoles: Role[] }
) {
	if (await membershipForJam(db, jam.id, ownerId))
		throw new ServiceError(
			"You're already on a team for this jam. Leave it first to start a new one."
		);

	const team: Team = {
		id: crypto.randomUUID(),
		jamId: jam.id,
		ownerId,
		name: input.name,
		description: input.description,
		openRoles: input.openRoles,
		status: 'open',
		createdAt: new Date()
	};
	try {
		await db.batch([db.insert(teams).values(team), ...joinStatements(db, team, ownerId)]);
	} catch (err) {
		if (isUniqueViolation(err)) throw new ServiceError("You're already on a team for this jam.");
		throw err;
	}
	return team;
}

export async function updateTeam(
	db: Db,
	teamId: string,
	actorId: string,
	input: { name: string; description: string; openRoles: Role[]; status: 'open' | 'full' }
) {
	const team = await requireOwnedTeam(db, teamId, actorId);
	await db.update(teams).set(input).where(eq(teams.id, team.id));
}

async function requireOwnedTeam(db: Db, teamId: string, actorId: string) {
	const team = await getTeam(db, teamId);
	if (!team) throw new ServiceError('That team no longer exists.');
	if (team.ownerId !== actorId) throw new ServiceError('Only the team owner can do that.');
	return team;
}

async function memberCount(db: Db, teamId: string) {
	const [row] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamMembers)
		.where(eq(teamMembers.teamId, teamId));
	return row?.n ?? 0;
}

export async function leaveTeam(db: Db, teamId: string, userId: string) {
	const team = await getTeam(db, teamId);
	if (!team) throw new ServiceError('That team no longer exists.');
	if (team.ownerId === userId) {
		if ((await memberCount(db, teamId)) > 1)
			throw new ServiceError('Hand ownership to someone else (or remove everyone) before leaving.');
		// Last one out: disband.
		await db.delete(teams).where(eq(teams.id, teamId));
		return { disbanded: true };
	}
	await db
		.delete(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
	return { disbanded: false };
}

export async function removeMember(db: Db, teamId: string, actorId: string, userId: string) {
	const team = await requireOwnedTeam(db, teamId, actorId);
	if (userId === team.ownerId)
		throw new ServiceError("You can't remove yourself; disband the team instead.");
	await db
		.delete(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

export async function transferOwnership(
	db: Db,
	teamId: string,
	actorId: string,
	newOwnerId: string
) {
	await requireOwnedTeam(db, teamId, actorId);
	const [member] = await db
		.select({ userId: teamMembers.userId })
		.from(teamMembers)
		.where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, newOwnerId)));
	if (!member) throw new ServiceError('The new owner must be a member of the team.');
	await db.update(teams).set({ ownerId: newOwnerId }).where(eq(teams.id, teamId));
}

export async function disbandTeam(db: Db, teamId: string, actorId: string) {
	await requireOwnedTeam(db, teamId, actorId);
	// Members, requests cascade.
	await db.delete(teams).where(eq(teams.id, teamId));
}

// ---------------------------------------------------------------------------
// Invites & join requests
// ---------------------------------------------------------------------------

async function assertNoPending(db: Db, teamId: string, userId: string) {
	const existing = await db.query.teamRequests.findFirst({
		where: and(
			eq(teamRequests.teamId, teamId),
			eq(teamRequests.userId, userId),
			eq(teamRequests.status, 'pending')
		)
	});
	if (existing)
		throw new ServiceError(
			existing.kind === 'invite'
				? 'There is already a pending invite.'
				: 'There is already a pending request.'
		);
}

async function assertTeamHasRoom(db: Db, team: Team) {
	if (team.status === 'full') throw new ServiceError('This team is not looking for more members.');
	if ((await memberCount(db, team.id)) >= MAX_TEAM_SIZE)
		throw new ServiceError(`Teams are limited to ${MAX_TEAM_SIZE} members.`);
}

export async function requestToJoin(db: Db, teamId: string, userId: string, message: string) {
	const team = await getTeam(db, teamId);
	if (!team) throw new ServiceError('That team no longer exists.');
	if (await membershipForJam(db, team.jamId, userId))
		throw new ServiceError("You're already on a team for this jam.");
	await assertTeamHasRoom(db, team);
	await assertNoPending(db, teamId, userId);

	const [outgoing] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamRequests)
		.where(
			and(
				eq(teamRequests.userId, userId),
				eq(teamRequests.kind, 'request'),
				eq(teamRequests.status, 'pending')
			)
		);
	if ((outgoing?.n ?? 0) >= MAX_PENDING_OUTGOING)
		throw new ServiceError('You have too many pending requests. Wait for some replies first.');

	await db.insert(teamRequests).values({ teamId, userId, kind: 'request', message });
}

export async function inviteUser(
	db: Db,
	teamId: string,
	actorId: string,
	userId: string,
	message: string
) {
	const team = await requireOwnedTeam(db, teamId, actorId);
	if (userId === actorId) throw new ServiceError("You can't invite yourself.");
	if (await membershipForJam(db, team.jamId, userId))
		throw new ServiceError('They are already on a team for this jam.');
	await assertTeamHasRoom(db, team);
	await assertNoPending(db, teamId, userId);

	const [outgoing] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamRequests)
		.where(
			and(
				eq(teamRequests.teamId, teamId),
				eq(teamRequests.kind, 'invite'),
				eq(teamRequests.status, 'pending')
			)
		);
	if ((outgoing?.n ?? 0) >= MAX_PENDING_OUTGOING)
		throw new ServiceError('Your team has too many pending invites.');

	await db.insert(teamRequests).values({ teamId, userId, kind: 'invite', message });
}

/** Who is allowed to accept/decline: the invitee for invites, the team owner for requests. */
function canRespond(kind: RequestKind, team: Team, requestUserId: string, actorId: string) {
	return kind === 'invite' ? requestUserId === actorId : team.ownerId === actorId;
}

export async function respondToRequest(
	db: Db,
	requestId: string,
	actorId: string,
	accept: boolean
) {
	const req = await db.query.teamRequests.findFirst({ where: eq(teamRequests.id, requestId) });
	if (!req || req.status !== 'pending')
		throw new ServiceError('This request is no longer pending.');
	const team = await getTeam(db, req.teamId);
	if (!team) throw new ServiceError('That team no longer exists.');
	if (!canRespond(req.kind, team, req.userId, actorId))
		throw new ServiceError("You can't answer this request.");

	if (!accept) {
		await db.update(teamRequests).set({ status: 'declined' }).where(eq(teamRequests.id, requestId));
		return { team, accepted: false };
	}

	if (await membershipForJam(db, team.jamId, req.userId)) {
		await db
			.update(teamRequests)
			.set({ status: 'cancelled' })
			.where(eq(teamRequests.id, requestId));
		throw new ServiceError(
			req.kind === 'invite'
				? "You're already on a team for this jam."
				: 'They already joined another team.'
		);
	}
	await assertTeamHasRoom(db, team);

	try {
		await db.batch([
			// joinStatements cancels all of the user's pending requests for the jam, so mark
			// this one accepted afterwards.
			...joinStatements(db, team, req.userId),
			db.update(teamRequests).set({ status: 'accepted' }).where(eq(teamRequests.id, requestId)),
			// Tell whoever sent it: the requester (owner accepted) or the owner (invitee accepted).
			db.insert(notifications).values({
				userId: req.kind === 'request' ? req.userId : team.ownerId,
				kind: req.kind === 'request' ? 'request_accepted' : 'invite_accepted',
				actorId,
				jamId: team.jamId,
				teamId: team.id,
				teamName: team.name
			})
		]);
	} catch (err) {
		if (isUniqueViolation(err)) throw new ServiceError('Already on a team for this jam.');
		throw err;
	}
	return { team, accepted: true };
}

export async function cancelRequest(db: Db, requestId: string, actorId: string) {
	const req = await db.query.teamRequests.findFirst({ where: eq(teamRequests.id, requestId) });
	if (!req || req.status !== 'pending')
		throw new ServiceError('This request is no longer pending.');
	const team = await getTeam(db, req.teamId);
	// Requests are withdrawn by the requester, invites by the team owner.
	const allowed = req.kind === 'request' ? req.userId === actorId : team?.ownerId === actorId;
	if (!allowed) throw new ServiceError("You can't cancel this.");
	await db
		.update(teamRequests)
		.set({ status: 'cancelled' })
		.where(and(eq(teamRequests.id, requestId), ne(teamRequests.status, 'accepted')));
}

// ---------------------------------------------------------------------------
// Team-ups: two solo jammers forming a team together
// ---------------------------------------------------------------------------

type NamedUser = { username: string; displayName: string | null };

/** "Mika & Devon", kept within the 60-character team name limit. Owners can rename it later. */
export function defaultTeamName(a: NamedUser, b: NamedUser) {
	const name = (u: NamedUser) => (u.displayName || u.username).slice(0, 28);
	return `${name(a)} & ${name(b)}`;
}

/**
 * Ask another solo jammer to team up. If they had already asked you, that counts as a yes and
 * the team is formed straight away (`formed` is returned).
 */
export async function sendTeamUp(
	db: Db,
	jam: Jam,
	fromId: string,
	toId: string,
	message: string
): Promise<{ formed: Team | null }> {
	if (fromId === toId) throw new ServiceError("You can't team up with yourself.");
	if (await membershipForJam(db, jam.id, fromId))
		throw new ServiceError("You're already on a team for this jam. Invite them to it instead.");
	if (await membershipForJam(db, jam.id, toId))
		throw new ServiceError('They already joined a team for this jam.');

	const pending = await db
		.select()
		.from(teamUps)
		.where(
			and(
				eq(teamUps.jamId, jam.id),
				eq(teamUps.status, 'pending'),
				or(
					and(eq(teamUps.fromUserId, fromId), eq(teamUps.toUserId, toId)),
					and(eq(teamUps.fromUserId, toId), eq(teamUps.toUserId, fromId))
				)
			)
		);
	if (pending.some((p) => p.fromUserId === fromId))
		throw new ServiceError('You already asked them to team up.');
	const theyAskedFirst = pending.find((p) => p.fromUserId === toId);
	if (theyAskedFirst)
		return { formed: (await respondToTeamUp(db, theyAskedFirst.id, fromId, true)).team };

	const [outgoing] = await db
		.select({ n: sql<number>`count(*)` })
		.from(teamUps)
		.where(and(eq(teamUps.fromUserId, fromId), eq(teamUps.status, 'pending')));
	if ((outgoing?.n ?? 0) >= MAX_PENDING_OUTGOING)
		throw new ServiceError('You have too many pending requests. Wait for some replies first.');

	await db.insert(teamUps).values({ jamId: jam.id, fromUserId: fromId, toUserId: toId, message });
	return { formed: null };
}

/** The recipient accepts (creating a team for both; the sender owns it) or declines. */
export async function respondToTeamUp(
	db: Db,
	teamUpId: string,
	actorId: string,
	accept: boolean
): Promise<{ team: Team | null }> {
	const req = await db.query.teamUps.findFirst({ where: eq(teamUps.id, teamUpId) });
	if (!req || req.status !== 'pending')
		throw new ServiceError('This request is no longer pending.');
	if (req.toUserId !== actorId) throw new ServiceError("You can't answer this request.");

	if (!accept) {
		await db.update(teamUps).set({ status: 'declined' }).where(eq(teamUps.id, teamUpId));
		return { team: null };
	}

	const [fromTeam, toTeam] = await Promise.all([
		membershipForJam(db, req.jamId, req.fromUserId),
		membershipForJam(db, req.jamId, req.toUserId)
	]);
	if (fromTeam || toTeam) {
		await db.update(teamUps).set({ status: 'cancelled' }).where(eq(teamUps.id, teamUpId));
		throw new ServiceError(
			toTeam ? "You're already on a team for this jam." : 'They already joined another team.'
		);
	}

	const people = await db
		.select({ id: users.id, username: users.username, displayName: users.displayName })
		.from(users)
		.where(inArray(users.id, [req.fromUserId, req.toUserId]));
	const from = people.find((p) => p.id === req.fromUserId)!;
	const to = people.find((p) => p.id === req.toUserId)!;

	const team: Team = {
		id: crypto.randomUUID(),
		jamId: req.jamId,
		ownerId: req.fromUserId,
		name: defaultTeamName(from, to),
		description: '',
		openRoles: [],
		status: 'open',
		createdAt: new Date()
	};
	try {
		await db.batch([
			db.insert(teams).values(team),
			...joinStatements(db, team, req.fromUserId),
			...joinStatements(db, team, req.toUserId),
			// joinStatements cancels every pending team-up for both people, so mark this one last.
			db
				.update(teamUps)
				.set({ status: 'accepted', teamId: team.id })
				.where(eq(teamUps.id, teamUpId)),
			db.insert(notifications).values({
				userId: req.fromUserId,
				kind: 'teamup_accepted',
				actorId: req.toUserId,
				jamId: team.jamId,
				teamId: team.id,
				teamName: team.name
			})
		]);
	} catch (err) {
		if (isUniqueViolation(err))
			throw new ServiceError('One of you already joined a team for this jam.');
		throw err;
	}
	return { team };
}

/** The sender withdraws a pending team-up. */
export async function cancelTeamUp(db: Db, teamUpId: string, actorId: string) {
	const req = await db.query.teamUps.findFirst({ where: eq(teamUps.id, teamUpId) });
	if (!req || req.status !== 'pending')
		throw new ServiceError('This request is no longer pending.');
	if (req.fromUserId !== actorId) throw new ServiceError("You can't cancel this.");
	await db.update(teamUps).set({ status: 'cancelled' }).where(eq(teamUps.id, teamUpId));
}
