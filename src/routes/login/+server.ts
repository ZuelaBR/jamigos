import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import { authorizeUrl, createPkce } from '#lib/server/auth/itch.ts';
import { randomToken } from '#lib/server/auth/crypto.ts';
import { safeRedirectPath } from '#lib/server/guards.ts';
import type { RequestHandler } from './$types';

import { OAUTH_COOKIE } from '#lib/server/auth/itch.ts';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const next = safeRedirectPath(url.searchParams.get('next'));
	const clientId = env.ITCH_CLIENT_ID;
	if (!clientId) {
		if (dev && env.DEV_AUTH === '1') redirect(303, `/auth/dev?next=${encodeURIComponent(next)}`);
		error(500, 'itch.io login is not configured (ITCH_CLIENT_ID is empty).');
	}

	const { verifier, challenge } = await createPkce();
	const state = randomToken(16);
	cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
		path: '/auth/callback',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 600
	});

	redirect(
		302,
		authorizeUrl({ clientId, redirectUri: `${url.origin}/auth/callback`, state, challenge })
	);
};
