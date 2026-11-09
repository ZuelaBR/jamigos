import { z } from 'zod';
import { ROLES } from '#lib/profile.ts';
import { str, strs } from './form.ts';

const roles = z.array(z.enum(ROLES)).transform((r) => [...new Set(r)]);

export const lfgSchema = z.object({
	roles: roles.pipe(z.array(z.enum(ROLES)).min(1, 'Pick at least one role you can fill.')),
	message: z.string().max(300, 'Keep it under 300 characters.')
});

export const teamSchema = z.object({
	name: z.string().min(2, 'Give your team a name.').max(60, 'Names are limited to 60 characters.'),
	description: z.string().max(500, 'Keep it under 500 characters.'),
	openRoles: roles,
	status: z.enum(['open', 'full']).default('open')
});

export const messageSchema = z.string().max(300, 'Keep it under 300 characters.');

export const parseLfgForm = (fd: FormData) =>
	lfgSchema.safeParse({ roles: strs(fd, 'roles'), message: str(fd, 'message') });

export const parseTeamForm = (fd: FormData) =>
	teamSchema.safeParse({
		name: str(fd, 'name'),
		description: str(fd, 'description'),
		openRoles: strs(fd, 'openRoles'),
		status: str(fd, 'status') || undefined
	});
