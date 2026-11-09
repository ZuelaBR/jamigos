import { activeJams, stats, upcomingJams } from '#lib/server/services/home.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [active, upcoming, totals] = await Promise.all([
		activeJams(locals.db, 6),
		upcomingJams(locals.db, 6),
		stats(locals.db)
	]);
	// Prefer jams where people are already teaming up; fill with popular upcoming jams.
	const slugs = new Set(active.map((j) => j.slug));
	const jams = [...active, ...upcoming.filter((j) => !slugs.has(j.slug))].slice(0, 6);
	return { jams, stats: totals };
};
