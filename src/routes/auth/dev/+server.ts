import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import { createSession, setSessionCookie } from '#lib/server/auth/session.ts';
import { upsertItchUser } from '#lib/server/auth/users.ts';
import { safeRedirectPath } from '#lib/server/guards.ts';
import type { RequestHandler } from './$types';

// Local-only login shortcut for development and Playwright. Disabled unless
// running the dev server AND DEV_AUTH=1.
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	if (!dev || env.DEV_AUTH !== '1') error(404, 'Not found');

	const username = (url.searchParams.get('user') ?? 'dev')
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '');
	if (!username) error(400, 'Invalid username');

	// Stable fake itch id derived from the username.
	let fakeId = 0;
	for (const ch of username) fakeId = (fakeId * 31 + ch.charCodeAt(0)) % 1_000_000_000;

	const user = await upsertItchUser(locals.db, {
		id: -1 - fakeId,
		username,
		display_name: username[0].toUpperCase() + username.slice(1),
		url: `https://${username}.itch.io`,
		cover_url: null
	});
	const session = await createSession(locals.db, user.id);
	setSessionCookie(cookies, session.token, session.expiresAt);

	const next = safeRedirectPath(url.searchParams.get('next'));
	redirect(303, user.onboarded ? next : `/onboarding?next=${encodeURIComponent(next)}`);
};
