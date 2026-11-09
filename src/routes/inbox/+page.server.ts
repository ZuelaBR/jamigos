import { attempt } from '#lib/server/actions.ts';
import { requireUser, requireUserForAction } from '#lib/server/guards.ts';
import { inboxItems } from '#lib/server/services/inbox.ts';
import { redirect } from '@sveltejs/kit';
import {
	cancelRequest,
	cancelTeamUp,
	respondToRequest,
	respondToTeamUp
} from '#lib/server/services/teams.ts';
import { str } from '#lib/server/validation/form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	return inboxItems(event.locals.db, user.id);
};

export const actions: Actions = {
	respond: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const accept = str(fd, 'accept') === '1';
		return attempt(async () => {
			const { accepted, team } = await respondToRequest(
				event.locals.db,
				str(fd, 'requestId'),
				user.id,
				accept
			);
			return { toast: accepted ? `Done! Welcome to ${team.name}.` : 'Declined.' };
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
	respondTeamUp: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		const accept = str(fd, 'accept') === '1';
		return attempt(async () => {
			const { team } = await respondToTeamUp(event.locals.db, str(fd, 'teamUpId'), user.id, accept);
			if (team) redirect(303, `/teams/${team.id}?teamup=1`);
			return { toast: 'Declined.' };
		});
	},
	cancelTeamUp: async (event) => {
		const user = requireUserForAction(event);
		const fd = await event.request.formData();
		return attempt(async () => {
			await cancelTeamUp(event.locals.db, str(fd, 'teamUpId'), user.id);
			return { toast: 'Cancelled.' };
		});
	}
};
