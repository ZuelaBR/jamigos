import { error, fail, redirect } from '@sveltejs/kit';
import { attempt } from '#lib/server/actions.ts';
import { requireUserForAction } from '#lib/server/guards.ts';
import { getJamBySlug } from '#lib/server/services/jams.ts';
import {
	cancelRequest,
	closeLfgPost,
	createTeam,
	getBoard,
	inviteUser,
	requestToJoin,
	respondToRequest,
	upsertLfgPost
} from '#lib/server/services/teams.ts';
import { fieldErrors, str } from '#lib/server/validation/form.ts';
import { messageSchema, parseLfgForm, parseTeamForm } from '#lib/server/validation/teams.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function loadJam(event: Pick<RequestEvent, 'params' | 'locals'>) {
	const jam = await getJamBySlug(event.locals.db, event.params.slug);
	if (!jam) error(404, "We don't know that jam yet. Try adding it from the jam list.");
	return jam;
}

export const load: PageServerLoad = async (event) => {
	const jam = await loadJam(event);
	const viewer = event.locals.user;
	const board = await getBoard(event.locals.db, jam.id, viewer?.id ?? null);
	return {
		jam,
		board,
		me: viewer && { id: viewer.id, roles: viewer.roles, timezone: viewer.timezone }
	};
};

const message = (fd: FormData) => {
	const parsed = messageSchema.safeParse(str(fd, 'message'));
	return parsed.success
		? { ok: true as const, value: parsed.data }
		: { ok: false as const, error: parsed.error.issues[0].message };
};

export const actions: Actions = {
	post: async (event) => {
		const user = requireUserForAction(event);
		const jam = await loadJam(event);
		const parsed = parseLfgForm(await event.request.formData());
		if (!parsed.success) return fail(400, { action: 'post', errors: fieldErrors(parsed.error) });
		return attempt(async () => {
			await upsertLfgPost(event.locals.db, jam, user.id, parsed.data);
			return { toast: "You're on the board! Teams can now find you." };
		});
	},

	unpost: async (event) => {
		const user = requireUserForAction(event);
		const jam = await loadJam(event);
		await closeLfgPost(event.locals.db, jam.id, user.id);
		return { toast: 'Your post was removed.' };
	},

	createTeam: async (event) => {
		const user = requireUserForAction(event);
		const jam = await loadJam(event);
		const parsed = parseTeamForm(await event.request.formData());
		if (!parsed.success)
			return fail(400, { action: 'createTeam', errors: fieldErrors(parsed.error) });
		const result = await attempt(() => createTeam(event.locals.db, jam, user.id, parsed.data));
		if ('id' in result) redirect(303, `/teams/${result.id}?created=1`);
		return result;
	},

	requestJoin: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const msg = message(fd);
		if (!msg.ok) return fail(400, { message: msg.error });
		return attempt(async () => {
			await requestToJoin(event.locals.db, str(fd, 'teamId'), user.id, msg.value);
			return { toast: 'Request sent! The team owner will see it in their inbox.' };
		});
	},

	invite: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const msg = message(fd);
		if (!msg.ok) return fail(400, { message: msg.error });
		return attempt(async () => {
			await inviteUser(event.locals.db, str(fd, 'teamId'), user.id, str(fd, 'userId'), msg.value);
			return { toast: 'Invite sent!' };
		});
	},

	cancel: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		return attempt(async () => {
			await cancelRequest(event.locals.db, str(fd, 'requestId'), user.id);
			return { toast: 'Cancelled.' };
		});
	},

	respond: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const accept = str(fd, 'accept') === '1';
		return attempt(async () => {
			const { team, accepted } = await respondToRequest(
				event.locals.db,
				str(fd, 'requestId'),
				user.id,
				accept
			);
			if (accepted) redirect(303, `/teams/${team.id}?joined=1`);
			return { toast: 'Declined.' };
		});
	}
};
