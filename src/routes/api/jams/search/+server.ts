import { json } from '@sveltejs/kit';
import { searchJams } from '#lib/server/services/home.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, setHeaders }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	if (q.length < 2) return json([]);
	setHeaders({ 'cache-control': 'public, max-age=60' });
	return json(await searchJams(locals.db, q));
};
