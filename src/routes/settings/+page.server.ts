import { fail } from '@sveltejs/kit';
import { requireUser, requireUserForAction } from '#lib/server/guards.ts';
import { profileValues, updateProfile } from '#lib/server/services/profile.ts';
import { parseProfileForm } from '#lib/server/validation/profile.ts';
import { fieldErrors } from '#lib/server/validation/form.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => ({ values: profileValues(requireUser(event)) });

export const actions: Actions = {
	default: async (event) => {
		const user = requireUserForAction(event);
		const parsed = parseProfileForm(await event.request.formData());
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await updateProfile(event.locals.db, user.id, parsed.data);
		return { saved: true };
	}
};
