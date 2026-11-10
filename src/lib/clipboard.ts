import { toast } from '#lib/toast.svelte.ts';

export async function copyToClipboard(text: string, message = 'Copied to clipboard.') {
	try {
		await navigator.clipboard.writeText(text);
		toast(message);
	} catch {
		toast('Copy didn’t work. Please select and copy the text manually.', 'error');
	}
}
