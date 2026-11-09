import { redirect } from '@sveltejs/kit';
import { pendingActionCount } from '#lib/server/services/inbox.ts';
import { THEME_COOKIE, parseTheme } from '#lib/theme.ts';
import type { LayoutServerLoad } from './$types';

const ONBOARDING_EXEMPT = ['/onboarding', '/logout', '/auth', '/login', '/api'];

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
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
		// On the inbox itself, updates are being read right now, so don't count them.
		inboxCount: user
			? await pendingActionCount(locals.db, user.id, { includeUpdates: url.pathname !== '/inbox' })
			: 0,
		theme: parseTheme(cookies.get(THEME_COOKIE))
	};
};
