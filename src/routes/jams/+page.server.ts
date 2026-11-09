import { fail, redirect } from '@sveltejs/kit';
import { jamSlugFromUrl, parseJamPage } from '#lib/jams/parse.ts';
import { parsePage } from '#lib/server/validation/pagination.ts';
import { requireUserForAction } from '#lib/server/guards.ts';
import {
	getJamBySlug,
	listJams,
	upsertJams,
	type JamSort,
	type JamTab
} from '#lib/server/services/jams.ts';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ url, locals }) => {
	const tab: JamTab = url.searchParams.get('tab') === 'upcoming' ? 'upcoming' : 'running';
	const sortParam = url.searchParams.get('sort');
	// Default to where people are actually teaming up; "closing soonest" buried the useful jams.
	const sort: JamSort = sortParam === 'popular' || sortParam === 'soon' ? sortParam : 'active';
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const page = parsePage(url.searchParams.get('page'));

	const rows = await listJams(locals.db, {
		tab,
		sort,
		q,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE
	});
	return {
		jams: rows.slice(0, PAGE_SIZE),
		hasMore: rows.length > PAGE_SIZE,
		filters: { tab, sort, q, page }
	};
};

export const actions: Actions = {
	add: async (event) => {
		requireUserForAction(event);
		const input = String((await event.request.formData()).get('url') ?? '');
		const slug = jamSlugFromUrl(input);
		if (!slug)
			return fail(400, {
				message: 'Paste a jam link like https://itch.io/jam/your-jam',
				url: input
			});

		if (await getJamBySlug(event.locals.db, slug)) redirect(303, `/jams/${slug}`);

		const res = await event.fetch(`https://itch.io/jam/${encodeURIComponent(slug)}`, {
			headers: { 'User-Agent': 'Jamigos/1.0 (game jam team finder)' }
		});
		if (res.status === 404)
			return fail(404, { message: "We couldn't find that jam on itch.io.", url: input });
		if (!res.ok)
			return fail(502, {
				message: 'itch.io is not responding right now. Try again in a minute.',
				url: input
			});

		const jam = parseJamPage(await res.text(), slug);
		if (!jam)
			return fail(422, { message: "That page doesn't look like an itch.io jam.", url: input });

		await upsertJams(event.locals.db, [jam], 'manual');
		redirect(303, `/jams/${slug}`);
	}
};
