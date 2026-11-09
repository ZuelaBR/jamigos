// Small Web Crypto helpers (available in Workers, Node 20+ and browsers).

export function base64url(bytes: Uint8Array): string {
	let s = '';
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(byteLength = 32): string {
	return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256Base64url(input: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return base64url(new Uint8Array(digest));
}
