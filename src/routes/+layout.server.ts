import { redirect } from '@sveltejs/kit';
import { pendingActionCount } from '#lib/server/services/inbox.ts';
import type { LayoutServerLoad } from './$types';

const ONBOARDING_EXEMPT = ['/onboarding', '/logout', '/auth', '/login', '/api'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (user && !user.onboarded && !ONBOARDING_EXEMPT.some((p) => url.pathname.startsWith(p))) {
		redirect(303, `/onboarding?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return {
		user: user && {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl,
			timezone: user.timezone
		},
		inboxCount: user ? await pendingActionCount(locals.db, user.id) : 0
	};
};
