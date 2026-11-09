import type { Handle } from '@sveltejs/kit/hooks';
import { env } from 'cloudflare:workers';
import { getDb } from '#lib/server/db/index.ts';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	setSessionCookie,
	validateSession
} from '#lib/server/auth/session.ts';
import { THEME_COOKIE, parseTheme } from '#lib/theme.ts';

export const handle: Handle = async ({ event, resolve }) => {
	if (!env.DB) throw new Error('D1 binding "DB" is missing (check wrangler.jsonc)');
	const db = getDb(env.DB);
	event.locals.db = db;
	event.locals.user = null;
	event.locals.sessionId = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const session = await validateSession(db, token);
		if (session) {
			event.locals.user = session.user;
			event.locals.sessionId = session.sessionId;
			setSessionCookie(event.cookies, token, session.expiresAt);
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	// Render the saved theme into <html data-theme> so the first paint is already correct.
	const theme = parseTheme(event.cookies.get(THEME_COOKIE));
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%app.theme%', theme === 'system' ? '' : theme)
	});
};
