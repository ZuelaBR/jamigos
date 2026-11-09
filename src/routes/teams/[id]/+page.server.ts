import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { attempt } from '#lib/server/actions.ts';
import { requireUserForAction } from '#lib/server/guards.ts';
import { jams, teamMembers, teamRequests, users } from '#lib/server/db/schema.ts';
import {
	cancelRequest,
	disbandTeam,
	getTeam,
	leaveTeam,
	removeMember,
	requestToJoin,
	respondToRequest,
	transferOwnership,
	updateTeam
} from '#lib/server/services/teams.ts';
import { fieldErrors, str } from '#lib/server/validation/form.ts';
import { messageSchema, parseTeamForm } from '#lib/server/validation/teams.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const db = locals.db;
	const team = await getTeam(db, params.id);
	if (!team) error(404, 'This team no longer exists.');
	const viewerId = locals.user?.id ?? null;

	const [jam, members, pending] = await Promise.all([
		db.query.jams.findFirst({ where: eq(jams.id, team.jamId) }),
		db
			.select({
				id: users.id,
				username: users.username,
				displayName: users.displayName,
				avatarUrl: users.avatarUrl,
				roles: users.roles,
				timezone: users.timezone,
				itchUrl: users.itchUrl,
				contactDiscord: users.contactDiscord
			})
			.from(teamMembers)
			.innerJoin(users, eq(users.id, teamMembers.userId))
			.where(eq(teamMembers.teamId, team.id))
			.orderBy(teamMembers.joinedAt),
		db
			.select({
				id: teamRequests.id,
				kind: teamRequests.kind,
				message: teamRequests.message,
				createdAt: teamRequests.createdAt,
				user: {
					id: users.id,
					username: users.username,
					displayName: users.displayName,
					avatarUrl: users.avatarUrl,
					roles: users.roles,
					timezone: users.timezone,
					experience: users.experience,
					tools: users.tools
				}
			})
			.from(teamRequests)
			.innerJoin(users, eq(users.id, teamRequests.userId))
			.where(and(eq(teamRequests.teamId, team.id), eq(teamRequests.status, 'pending')))
	]);
	if (!jam) error(404, 'This team no longer exists.');

	const isOwner = team.ownerId === viewerId;
	const isMember = members.some((m) => m.id === viewerId);
	// Contact details: signed-in users only (same rule as profiles).
	const showContact = !!viewerId;

	return {
		team,
		jam: { slug: jam.slug, title: jam.title, endsAt: jam.endsAt },
		members: members.map((m) => ({
			...m,
			contactDiscord: showContact ? m.contactDiscord : null
		})),
		isOwner,
		isMember,
		// Owners see everything pending; others only see their own request/invite.
		pending: isOwner ? pending : pending.filter((p) => p.user.id === viewerId)
	};
};

const TYPE_NAME_MESSAGE = 'Type the team name exactly to confirm.';
const nameConfirmed = (fd: FormData, name: string) => str(fd, 'confirm') === name.trim();

export const actions: Actions = {
	update: async (event) => {
		const user = requireUserForAction(event);
		const parsed = parseTeamForm(await event.request.formData());
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		return attempt(async () => {
			await updateTeam(event.locals.db, event.params.id, user.id, parsed.data);
			return { toast: 'Team updated.' };
		});
	},

	leave: async (event) => {
		const user = requireUserForAction(event);
		const team = await getTeam(event.locals.db, event.params.id);
		// An owner can only leave as the last member, which deletes the team: same check as disband.
		if (team?.ownerId === user.id && !nameConfirmed(await event.request.formData(), team.name)) {
			return fail(400, { message: TYPE_NAME_MESSAGE });
		}
		const jam =
			team && (await event.locals.db.query.jams.findFirst({ where: eq(jams.id, team.jamId) }));
		const result = await attempt(() => leaveTeam(event.locals.db, event.params.id, user.id));
		if ('disbanded' in result) redirect(303, jam ? `/jams/${jam.slug}?left=1` : '/jams');
		return result;
	},

	disband: async (event) => {
		const user = requireUserForAction(event);
		const team = await getTeam(event.locals.db, event.params.id);
		// Deleting a team for everyone must be deliberate: the exact team name is required.
		if (team && !nameConfirmed(await event.request.formData(), team.name)) {
			return fail(400, { message: TYPE_NAME_MESSAGE });
		}
		const jam =
			team && (await event.locals.db.query.jams.findFirst({ where: eq(jams.id, team.jamId) }));
		const result = await attempt(() => disbandTeam(event.locals.db, event.params.id, user.id));
		if (result === undefined) redirect(303, jam ? `/jams/${jam.slug}?disbanded=1` : '/jams');
		return result;
	},

	remove: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		return attempt(async () => {
			await removeMember(event.locals.db, event.params.id, user.id, str(fd, 'userId'));
			return { toast: 'Member removed.' };
		});
	},

	transfer: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		return attempt(async () => {
			await transferOwnership(event.locals.db, event.params.id, user.id, str(fd, 'userId'));
			return { toast: 'Ownership transferred.' };
		});
	},

	requestJoin: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const msg = messageSchema.safeParse(str(fd, 'message'));
		if (!msg.success) return fail(400, { message: msg.error.issues[0].message });
		return attempt(async () => {
			await requestToJoin(event.locals.db, event.params.id, user.id, msg.data);
			return { toast: 'Request sent!' };
		});
	},

	respond: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const accept = str(fd, 'accept') === '1';
		return attempt(async () => {
			const { accepted } = await respondToRequest(
				event.locals.db,
				str(fd, 'requestId'),
				user.id,
				accept
			);
			return { toast: accepted ? 'Welcome aboard!' : 'Declined.' };
		});
	},

	cancel: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		return attempt(async () => {
			await cancelRequest(event.locals.db, str(fd, 'requestId'), user.id);
			return { toast: 'Cancelled.' };
		});
	}
};
