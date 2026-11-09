import { error, redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { exchangeCode, fetchProfile } from '#lib/server/auth/itch.ts';
import { createSession, setSessionCookie } from '#lib/server/auth/session.ts';
import { upsertItchUser } from '#lib/server/auth/users.ts';
import { safeRedirectPath } from '#lib/server/guards.ts';
import { OAUTH_COOKIE } from '#lib/server/auth/itch.ts';
import type { RequestHandler } from './$types';

const oauthCookie = z.object({ state: z.string(), verifier: z.string(), next: z.string() });

export const GET: RequestHandler = async ({ url, cookies, locals, fetch }) => {
	const raw = cookies.get(OAUTH_COOKIE);
	cookies.delete(OAUTH_COOKIE, { path: '/auth/callback' });

	if (url.searchParams.get('error')) redirect(303, '/?login=cancelled');

	const code = url.searchParams.get('code');
	const parsed = raw ? oauthCookie.safeParse(JSON.parse(raw)) : null;
	if (!code || !parsed?.success || parsed.data.state !== url.searchParams.get('state')) {
		error(400, 'The sign-in link expired or was tampered with. Please try again.');
	}

	const clientId = env.ITCH_CLIENT_ID;
	const accessToken = await exchangeCode(
		{ clientId, redirectUri: `${url.origin}/auth/callback`, code, verifier: parsed.data.verifier },
		fetch
	);
	// The token is only used once to read the profile; we never store it.
	const profile = await fetchProfile(accessToken, fetch);
	const user = await upsertItchUser(locals.db, profile);

	const session = await createSession(locals.db, user.id);
	setSessionCookie(cookies, session.token, session.expiresAt);

	redirect(
		303,
		user.onboarded
			? safeRedirectPath(parsed.data.next)
			: `/onboarding?next=${encodeURIComponent(parsed.data.next)}`
	);
};
