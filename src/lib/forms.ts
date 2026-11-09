import type { SubmitFunction } from '$app/forms';
import { toast } from '#lib/toast.svelte.ts';

/**
 * `use:enhance` callback for action forms: shows `{ toast }` / `{ message }` results as
 * toasts, tracks pending state, and optionally runs `onSuccess` (e.g. to close a modal).
 */
export function withToasts(
	opts: { pending?: (v: boolean) => void; onSuccess?: () => void } = {}
): SubmitFunction {
	return () => {
		opts.pending?.(true);
		return async ({ result, update }) => {
			opts.pending?.(false);
			if (result.type === 'success') {
				const msg = result.data?.toast;
				if (typeof msg === 'string') toast(msg);
				opts.onSuccess?.();
			} else if (result.type === 'failure') {
				const msg = result.data?.message;
				toast(typeof msg === 'string' ? msg : 'Please fix the highlighted fields.', 'error');
			} else if (result.type === 'error') {
				toast(result.error?.message ?? 'Something went wrong. Please try again.', 'error');
			}
			// Stay on the current URL (keeps tab/filter query params) instead of navigating to the action URL.
			await update({ reset: result.type === 'success', navigate: false });
		};
	};
}
