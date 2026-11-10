import { requireUser } from '#lib/server/guards.ts';
import { myTeams } from '#lib/server/services/my-teams.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	return myTeams(event.locals.db, user.id);
};
