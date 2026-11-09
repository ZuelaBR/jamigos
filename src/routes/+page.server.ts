import { listJams } from '#lib/server/services/jams.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [running, upcoming] = await Promise.all([
		listJams(locals.db, { tab: 'running', sort: 'active', limit: 6, offset: 0 }),
		listJams(locals.db, { tab: 'upcoming', sort: 'soon', limit: 6, offset: 0 })
	]);
	return { running: running.slice(0, 6), upcoming: upcoming.slice(0, 6) };
};
