import { attempt } from '#lib/server/actions.ts';
import { requireUser, requireUserForAction } from '#lib/server/guards.ts';
import { inboxItems } from '#lib/server/services/inbox.ts';
import { cancelRequest, respondToRequest } from '#lib/server/services/teams.ts';
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
			return { toast: accepted ? `Done! Welcome to ${team.name}. 🎉` : 'Declined.' };
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
