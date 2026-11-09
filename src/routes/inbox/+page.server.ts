import { attempt } from '#lib/server/actions.ts';
import { requireUser, requireUserForAction } from '#lib/server/guards.ts';
import { inboxItems, markUpdatesRead, recentUpdates } from '#lib/server/services/inbox.ts';
import { redirect } from '@sveltejs/kit';
import {
	cancelRequest,
	cancelTeamUp,
	respondToRequest,
	respondToTeamUp
} from '#lib/server/services/teams.ts';
import { parsePage } from '#lib/server/validation/pagination.ts';
import { str } from '#lib/server/validation/form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const db = event.locals.db;
	const updatesPage = parsePage(event.url.searchParams.get('updatesPage'));
	const pageSize = 20;
	const [items, rows] = await Promise.all([
		inboxItems(db, user.id),
		recentUpdates(db, user.id, pageSize + 1, (updatesPage - 1) * pageSize)
	]);
	const updates = rows.slice(0, pageSize);
	// Only updates actually included on this page have been read.
	await markUpdatesRead(
		db,
		user.id,
		updates.filter((u) => !u.readAt).map((u) => u.id)
	);
	return {
		...items,
		updates: updates.map(({ readAt, ...u }) => ({ ...u, isNew: !readAt })),
		updatesPage,
		hasMoreUpdates: rows.length > pageSize
	};
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
