import { desc, eq } from 'drizzle-orm';
import type { Db } from '#lib/server/db/index.ts';
import { jams, teamMembers, teams } from '#lib/server/db/schema.ts';
import { teamMembersOf } from './teams.ts';

/** Every team the user belongs to, including teams they own and past jams. */
export async function myTeams(db: Db, userId: string, now = new Date()) {
	const rows = await db
		.select({
			team: teams,
			jam: { slug: jams.slug, title: jams.title, startsAt: jams.startsAt, endsAt: jams.endsAt }
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.innerJoin(jams, eq(jams.id, teams.jamId))
		.where(eq(teamMembers.userId, userId))
		.orderBy(desc(teamMembers.joinedAt), desc(teams.id));

	// Keep each IN query within D1's bound-parameter limit, without hiding older teams.
	const members: Awaited<ReturnType<typeof teamMembersOf>> = [];
	for (let i = 0; i < rows.length; i += 80) {
		members.push(
			...(await teamMembersOf(
				db,
				rows.slice(i, i + 80).map((row) => row.team.id)
			))
		);
	}
	const cards = rows.map(({ team, jam }) => ({
		...team,
		jam,
		isOwner: team.ownerId === userId,
		members: members.filter((member) => member.teamId === team.id)
	}));
	const ended = (team: (typeof cards)[number]) => !!team.jam.endsAt && team.jam.endsAt <= now;
	return { current: cards.filter((team) => !ended(team)), past: cards.filter(ended) };
}
