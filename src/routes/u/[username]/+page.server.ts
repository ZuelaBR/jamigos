import { error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { findUserByUsername } from '#lib/server/auth/users.ts';
import { jams, teamMembers, teams } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await findUserByUsername(locals.db, params.username);
	if (!profile || !profile.onboarded) error(404, 'No jammer with that name (yet).');

	const memberships = await locals.db
		.select({
			teamId: teams.id,
			teamName: teams.name,
			jamSlug: jams.slug,
			jamTitle: jams.title,
			endsAt: jams.endsAt
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.innerJoin(jams, eq(jams.id, teamMembers.jamId))
		.where(eq(teamMembers.userId, profile.id))
		.orderBy(desc(teamMembers.joinedAt))
		.limit(10);

	// Contact details are only visible to signed-in users (keeps scrapers out).
	const showContact = !!locals.user;
	return {
		profile: {
			username: profile.username,
			displayName: profile.displayName,
			avatarUrl: profile.avatarUrl,
			itchUrl: profile.itchUrl,
			bio: profile.bio,
			roles: profile.roles,
			tools: profile.tools,
			experience: profile.experience,
			timezone: profile.timezone,
			links: profile.links,
			contactDiscord: showContact ? profile.contactDiscord : null,
			contactEmail: showContact ? profile.contactEmail : null
		},
		showContact,
		isMe: locals.user?.id === profile.id,
		memberships
	};
};
