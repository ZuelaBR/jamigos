import { z } from 'zod';
import { EXPERIENCES, ROLES } from '#lib/profile.ts';
import { isValidTimeZone } from '#lib/tz.ts';
import { str, strs } from './form.ts';

const optional = (schema: z.ZodString) =>
	z.preprocess((v) => (v === '' ? null : v), schema.nullable());

export const roleList = z.array(z.enum(ROLES)).transform((r) => [...new Set(r)]);

export const profileSchema = z.object({
	roles: roleList.pipe(z.array(z.enum(ROLES)).min(1, 'Pick at least one thing you can do.')),
	tools: z
		.array(z.string().max(30, 'Tool names must be 30 characters or less.'))
		.max(12, 'Pick up to 12 tools.')
		.transform((t) => [...new Map(t.map((x) => [x.toLowerCase(), x])).values()]),
	experience: z.enum(EXPERIENCES, { message: 'Choose your experience level.' }),
	timezone: z.string().refine(isValidTimeZone, 'Choose a valid timezone.'),
	bio: z.string().max(500, 'Keep your bio under 500 characters.'),
	contactDiscord: optional(
		z
			.string()
			.max(40)
			.regex(/^[a-zA-Z0-9_.]{2,32}$/, 'That does not look like a Discord username.')
	),
	contactEmail: optional(z.string().email('Enter a valid email address.').max(120)),
	links: z
		.array(
			z
				.string()
				.url('Links must be full URLs (https://…).')
				.max(200)
				.refine(
					(u) => u.startsWith('https://') || u.startsWith('http://'),
					'Links must use http(s).'
				)
		)
		.max(3, 'Up to 3 links.')
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function parseProfileForm(fd: FormData) {
	return profileSchema.safeParse({
		roles: strs(fd, 'roles'),
		tools: strs(fd, 'tools'),
		experience: str(fd, 'experience'),
		timezone: str(fd, 'timezone'),
		bio: str(fd, 'bio'),
		contactDiscord: str(fd, 'contactDiscord').replace(/^@/, ''),
		contactEmail: str(fd, 'contactEmail'),
		links: strs(fd, 'links')
	});
}
