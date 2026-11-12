import { afterAll, expect, it, vi } from 'vitest';
import { isRedirect } from '@sveltejs/kit';
import { createHash } from 'node:crypto';

vi.mock('$app/env', () => ({ dev: false }));
vi.hoisted(() => {
	// The Cloudflare adapter resolves this module to its environment proxy in Node.
	vi.stubGlobal('__sveltekit_cloudflare_platform', {
		env: { ITCH_CLIENT_ID: 'test-client', DEV_AUTH: '' }
	});
});
afterAll(() => vi.unstubAllGlobals());

import { GET } from './+server.ts';

it('redirects production login to itch.io with matching state, callback and PKCE challenge', async () => {
	const setCookie = vi.fn();
	const event = {
		url: new URL('https://jamigos.example/login?next=%2Fteams'),
		cookies: { set: setCookie }
	} as unknown as Parameters<typeof GET>[0];

	let caught: unknown;
	try {
		await GET(event);
	} catch (error) {
		caught = error;
	}
	if (!isRedirect(caught)) throw caught;
	expect(isRedirect(caught)).toBe(true);
	expect(caught.status).toBe(302);
	const destination = new URL(caught.location);
	expect(destination.origin + destination.pathname).toBe('https://itch.io/user/oauth');
	expect(destination.searchParams.get('client_id')).toBe('test-client');
	expect(destination.searchParams.get('redirect_uri')).toBe(
		'https://jamigos.example/auth/callback'
	);
	expect(destination.searchParams.get('scope')).toBe('profile:me');
	expect(destination.searchParams.get('response_type')).toBe('code');
	expect(destination.searchParams.get('code_challenge_method')).toBe('S256');
	expect(setCookie).toHaveBeenCalledOnce();
	const [name, value, options] = setCookie.mock.calls[0];
	expect(name).toBe('itch_oauth');
	expect(options).toMatchObject({
		path: '/auth/callback',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600
	});
	const saved = JSON.parse(value);
	expect(saved.next).toBe('/teams');
	expect(destination.searchParams.get('state')).toBe(saved.state);
	expect(destination.searchParams.get('code_challenge')).toBe(
		createHash('sha256').update(saved.verifier).digest('base64url')
	);
	expect(destination.searchParams.has('code_verifier')).toBe(false);
});
