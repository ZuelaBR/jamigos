import { fail } from '@sveltejs/kit';
import { ServiceError } from '#lib/server/services/teams.ts';

/**
 * Runs a form action body, turning expected `ServiceError`s into `fail(400, { message })`
 * so the page can show a toast instead of an error page. Anything else is rethrown.
 */
export async function attempt<T>(fn: () => Promise<T>) {
	try {
		return await fn();
	} catch (err) {
		if (err instanceof ServiceError) return fail(400, { message: err.message });
		throw err;
	}
}
