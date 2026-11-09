import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import type { Db } from '#lib/server/db/index.ts';
import { sessions, users, type User } from '#lib/server/db/schema.ts';
import { randomToken, sha256Base64url } from './crypto';

export const SESSION_COOKIE = 'session';
const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * DAY;
const RENEW_THRESHOLD = 15 * DAY;

// The cookie holds a random token; the database only stores its hash,
// so a leaked database dump cannot be used to hijack sessions.
export async function createSession(db: Db, userId: string) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(sessions).values({ id: await sha256Base64url(token), userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSession(
	db: Db,
	token: string
): Promise<{ user: User; sessionId: string; expiresAt: Date } | null> {
	const sessionId = await sha256Base64url(token);
	const [row] = await db
		.select({ user: users, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId));
	if (!row) return null;

	const now = Date.now();
	if (row.expiresAt.getTime() <= now) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}
	let expiresAt = row.expiresAt;
	if (expiresAt.getTime() - now < RENEW_THRESHOLD) {
		expiresAt = new Date(now + SESSION_TTL);
		await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, sessionId));
	}
	return { user: row.user, sessionId, expiresAt };
}

export async function invalidateSession(db: Db, sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
