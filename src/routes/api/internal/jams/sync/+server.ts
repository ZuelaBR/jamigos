import { error, json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { sha256Base64url } from '#lib/server/auth/crypto.ts';
import { upsertJams } from '#lib/server/services/jams.ts';
import type { RequestHandler } from './$types';

const isoOrNull = z.string().datetime().nullable();
const payload = z.object({
	jams: z
		.array(
			z.object({
				slug: z.string().regex(/^[a-z0-9-]{1,150}$/),
				title: z.string().min(1).max(200),
				url: z.string().url().startsWith('https://itch.io/jam/'),
				hostName: z.string().max(200).nullable(),
				hostUrl: z.string().url().max(300).nullable(),
				coverUrl: z.string().url().max(500).nullable(),
				startsAt: isoOrNull,
				endsAt: isoOrNull,
				joinedCount: z.number().int().min(0),
				phase: z.enum(['upcoming', 'running', 'voting', 'unknown'])
			})
		)
		.max(100)
});

// Compare hashes so the check takes the same time regardless of where the strings differ.
async function secretMatches(given: string, expected: string) {
	return (await sha256Base64url(given)) === (await sha256Base64url(expected));
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const expected = env.SYNC_SECRET;
	const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	if (!expected || !given || !(await secretMatches(given, expected))) error(401, 'Unauthorized');

	const parsed = payload.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		error(400, `${issue?.path.join('.') ?? 'payload'}: ${issue?.message ?? 'invalid'}`);
	}

	// Jams in voting no longer accept new teams; skip them.
	const active = parsed.data.jams.filter((j) => j.phase !== 'voting');
	const upserted = await upsertJams(locals.db, active);
	return json({ upserted, skipped: parsed.data.jams.length - active.length });
};
