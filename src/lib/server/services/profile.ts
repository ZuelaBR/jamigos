import { eq } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { users, type User } from '#lib/server/db/schema.ts';
import type { ProfileInput } from '#lib/server/validation/profile.ts';

export async function updateProfile(db: Db, userId: string, input: ProfileInput) {
	await db
		.update(users)
		.set({ ...input, onboarded: true, updatedAt: new Date() })
		.where(eq(users.id, userId));
}

export function profileValues(user: User) {
	return {
		roles: user.roles,
		tools: user.tools,
		experience: user.experience,
		timezone: user.timezone,
		bio: user.bio,
		contactDiscord: user.contactDiscord,
		links: user.links
	};
}
