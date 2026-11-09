import { z } from 'zod';
import { base64url, randomToken } from './crypto';

// itch.io OAuth: authorization code flow with PKCE, no client secret.
// Docs: https://itch.io/docs/api/oauth
const AUTHORIZE_URL = 'https://itch.io/user/oauth';
const TOKEN_URL = 'https://api.itch.io/oauth/token';
const PROFILE_URL = 'https://api.itch.io/profile';

/** Short-lived cookie holding the PKCE verifier, state and post-login destination. */
export const OAUTH_COOKIE = 'itch_oauth';

export async function createPkce() {
	const verifier = randomToken(48);
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
	return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function authorizeUrl(opts: {
	clientId: string;
	redirectUri: string;
	state: string;
	challenge: string;
}) {
	const url = new URL(AUTHORIZE_URL);
	url.searchParams.set('client_id', opts.clientId);
	url.searchParams.set('scope', 'profile:me');
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('redirect_uri', opts.redirectUri);
	url.searchParams.set('state', opts.state);
	url.searchParams.set('code_challenge', opts.challenge);
	url.searchParams.set('code_challenge_method', 'S256');
	return url.toString();
}

const tokenResponse = z.object({ access_token: z.string().min(1) });

export async function exchangeCode(
	opts: { clientId: string; redirectUri: string; code: string; verifier: string },
	fetchFn: typeof fetch = fetch
): Promise<string> {
	const res = await fetchFn(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: opts.clientId,
			redirect_uri: opts.redirectUri,
			code: opts.code,
			code_verifier: opts.verifier
		})
	});
	if (!res.ok) throw new Error(`itch.io token exchange failed (${res.status})`);
	return tokenResponse.parse(await res.json()).access_token;
}

const profileResponse = z.object({
	user: z.object({
		id: z.number(),
		username: z.string(),
		display_name: z.string().nullish(),
		url: z.string(),
		cover_url: z.string().nullish()
	})
});

export type ItchProfile = z.infer<typeof profileResponse>['user'];

export async function fetchProfile(
	accessToken: string,
	fetchFn: typeof fetch = fetch
): Promise<ItchProfile> {
	const res = await fetchFn(PROFILE_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
	if (!res.ok) throw new Error(`itch.io profile request failed (${res.status})`);
	return profileResponse.parse(await res.json()).user;
}
