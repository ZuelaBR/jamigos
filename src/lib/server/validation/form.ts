import type { z } from 'zod';

export type FieldErrors = Record<string, string>;

/** Flattens zod issues into `{ field: firstMessage }` for showing next to inputs. */
export function fieldErrors(error: z.ZodError): FieldErrors {
	const out: FieldErrors = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? '_form');
		out[key] ??= issue.message;
	}
	return out;
}

export const str = (fd: FormData, key: string) => {
	const v = fd.get(key);
	return typeof v === 'string' ? v.trim() : '';
};

export const strs = (fd: FormData, key: string) =>
	fd
		.getAll(key)
		.filter((v): v is string => typeof v === 'string')
		.map((v) => v.trim())
		.filter(Boolean);
