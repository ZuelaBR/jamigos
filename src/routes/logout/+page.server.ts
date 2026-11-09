import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, invalidateSession } from '#lib/server/auth/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (locals.sessionId) await invalidateSession(locals.db, locals.sessionId);
		clearSessionCookie(cookies);
		redirect(303, '/');
	}
};
