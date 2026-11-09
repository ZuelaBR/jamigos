import { eq } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import type { ItchProfile } from './itch';

// Create or refresh the local user from their itch.io profile.
export async function upsertItchUser(db: Db, p: ItchProfile) {
	const fields = {
		username: p.username,
		displayName: p.display_name ?? null,
		avatarUrl: p.cover_url ?? null,
		itchUrl: p.url,
		updatedAt: new Date()
	};
	const [user] = await db
		.insert(users)
		.values({ itchId: p.id, ...fields })
		.onConflictDoUpdate({ target: users.itchId, set: fields })
		.returning();
	return user;
}

export async function findUserByUsername(db: Db, username: string) {
	return db.query.users.findFirst({ where: eq(users.username, username) });
}
