import { fail, redirect } from '@sveltejs/kit';
import { requireUser, safeRedirectPath } from '#lib/server/guards.ts';
import { profileValues, updateProfile } from '#lib/server/services/profile.ts';
import { parseProfileForm } from '#lib/server/validation/profile.ts';
import { fieldErrors } from '#lib/server/validation/form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const user = requireUser(event);
	const next = safeRedirectPath(event.url.searchParams.get('next'), '/jams');
	if (user.onboarded) redirect(303, next);
	return { values: profileValues(user) };
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const parsed = parseProfileForm(await event.request.formData());
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await updateProfile(event.locals.db, user.id, parsed.data);
		redirect(303, safeRedirectPath(event.url.searchParams.get('next'), '/jams'));
	}
};
