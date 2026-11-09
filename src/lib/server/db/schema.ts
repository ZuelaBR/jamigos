import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import type { Experience, Role } from '#lib/profile.ts';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const now = sql`(unixepoch() * 1000)`;

export const users = sqliteTable('users', {
	id: id(),
	itchId: integer('itch_id').notNull().unique(),
	username: text('username').notNull().unique(),
	displayName: text('display_name'),
	avatarUrl: text('avatar_url'),
	itchUrl: text('itch_url').notNull(),
	bio: text('bio').notNull().default(''),
	roles: text('roles', { mode: 'json' }).$type<Role[]>().notNull().default([]),
	tools: text('tools', { mode: 'json' }).$type<string[]>().notNull().default([]),
	timezone: text('timezone').notNull().default('UTC'),
	experience: text('experience').$type<Experience>().notNull().default('some'),
	contactDiscord: text('contact_discord'),
	links: text('links', { mode: 'json' }).$type<string[]>().notNull().default([]),
	onboarded: integer('onboarded', { mode: 'boolean' }).notNull().default(false),
	createdAt: timestamp('created_at').notNull().default(now),
	updatedAt: timestamp('updated_at').notNull().default(now)
});

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at').notNull()
	},
	(t) => [index('sessions_user_idx').on(t.userId)]
);

export const jams = sqliteTable(
	'jams',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		url: text('url').notNull(),
		hostName: text('host_name'),
		hostUrl: text('host_url'),
		coverUrl: text('cover_url'),
		startsAt: timestamp('starts_at'),
		endsAt: timestamp('ends_at'),
		joinedCount: integer('joined_count').notNull().default(0),
		source: text('source').$type<'sync' | 'manual'>().notNull().default('sync'),
		lastSeenAt: timestamp('last_seen_at').notNull().default(now),
		updatedAt: timestamp('updated_at').notNull().default(now)
	},
	(t) => [index('jams_ends_idx').on(t.endsAt), index('jams_starts_idx').on(t.startsAt)]
);

export const teams = sqliteTable(
	'teams',
	{
		id: id(),
		jamId: text('jam_id')
			.notNull()
			.references(() => jams.id, { onDelete: 'cascade' }),
		ownerId: text('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		openRoles: text('open_roles', { mode: 'json' }).$type<Role[]>().notNull().default([]),
		status: text('status').$type<'open' | 'full'>().notNull().default('open'),
		createdAt: timestamp('created_at').notNull().default(now)
	},
	(t) => [index('teams_jam_idx').on(t.jamId)]
);

export const teamMembers = sqliteTable(
	'team_members',
	{
		teamId: text('team_id')
			.notNull()
			.references(() => teams.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		// Denormalised so the database can enforce "one team per jam" per user.
		jamId: text('jam_id')
			.notNull()
			.references(() => jams.id, { onDelete: 'cascade' }),
		joinedAt: timestamp('joined_at').notNull().default(now)
	},
	(t) => [
		primaryKey({ columns: [t.teamId, t.userId] }),
		uniqueIndex('team_members_jam_user_uq').on(t.jamId, t.userId)
	]
);

export const lfgPosts = sqliteTable(
	'lfg_posts',
	{
		id: id(),
		jamId: text('jam_id')
			.notNull()
			.references(() => jams.id, { onDelete: 'cascade' }),
		authorId: text('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		message: text('message').notNull().default(''),
		roles: text('roles', { mode: 'json' }).$type<Role[]>().notNull().default([]),
		status: text('status').$type<'open' | 'closed'>().notNull().default('open'),
		createdAt: timestamp('created_at').notNull().default(now),
		updatedAt: timestamp('updated_at').notNull().default(now)
	},
	(t) => [uniqueIndex('lfg_jam_author_uq').on(t.jamId, t.authorId)]
);

export type RequestKind = 'invite' | 'request';
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export const teamRequests = sqliteTable(
	'team_requests',
	{
		id: id(),
		teamId: text('team_id')
			.notNull()
			.references(() => teams.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: text('kind').$type<RequestKind>().notNull(),
		status: text('status').$type<RequestStatus>().notNull().default('pending'),
		message: text('message').notNull().default(''),
		createdAt: timestamp('created_at').notNull().default(now)
	},
	(t) => [index('requests_team_idx').on(t.teamId), index('requests_user_idx').on(t.userId)]
);

export type TeamUpStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

/**
 * "Let's team up": a request between two solo jammers, before any team exists. When the
 * recipient accepts, a team is created with both of them (the sender owns it).
 */
export const teamUps = sqliteTable(
	'team_ups',
	{
		id: id(),
		jamId: text('jam_id')
			.notNull()
			.references(() => jams.id, { onDelete: 'cascade' }),
		fromUserId: text('from_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		toUserId: text('to_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		message: text('message').notNull().default(''),
		status: text('status').$type<TeamUpStatus>().notNull().default('pending'),
		// The team created on accept.
		teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').notNull().default(now)
	},
	(t) => [
		index('team_ups_to_idx').on(t.toUserId),
		index('team_ups_from_idx').on(t.fromUserId),
		index('team_ups_jam_idx').on(t.jamId)
	]
);

export type User = typeof users.$inferSelect;
export type Jam = typeof jams.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type LfgPost = typeof lfgPosts.$inferSelect;
export type TeamRequest = typeof teamRequests.$inferSelect;
export type TeamUp = typeof teamUps.$inferSelect;
