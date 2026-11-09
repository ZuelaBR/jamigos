import { error, redirect, type RequestEvent } from '@sveltejs/kit';

// Only allow same-site relative redirects ("/foo", never "//evil.com" or "https://...").
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
		return fallback;
	return value;
}

export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const user = event.locals.user;
	if (!user)
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	return user;
}

// For form actions: an anonymous POST should not silently redirect away and lose input.
export function requireUserForAction(event: Pick<RequestEvent, 'locals'>) {
	const user = event.locals.user;
	if (!user) error(401, 'Please sign in first.');
	return user;
}
