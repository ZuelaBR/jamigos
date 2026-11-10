<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { dialogs } from '#lib/dialog.svelte.ts';
	import Toasts from './Toasts.svelte';

	let {
		open = $bindable(false),
		title,
		onclose,
		children
	}: { open?: boolean; title: string; onclose?: () => void; children: Snippet } = $props();

	function close() {
		open = false;
		onclose?.();
	}
	let dialog: HTMLDialogElement | undefined = $state();
	// Unique per instance: a page can hold several modals, and duplicate ids would give
	// every dialog the first one's accessible name.
	const uid = $props.id();
	const titleId = `modal-title-${uid}`;

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
	$effect(() => {
		if (!open) return;
		untrack(() => dialogs.count++);
		return () => untrack(() => dialogs.count--);
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => {
		// A close event can arrive after this dialog has already reopened.
		if (!dialog?.open) close();
	}}
	onclick={(e) => e.target === dialog && close()}
	class="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
	aria-labelledby={titleId}
>
	<div class="p-5 sm:p-6">
		<div class="mb-4 flex items-start justify-between gap-4">
			<h2 id={titleId} class="text-lg font-semibold">{title}</h2>
			<button
				type="button"
				class="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none text-muted hover:bg-surface-2 hover:text-text"
				aria-label="Close"
				onclick={close}>×</button
			>
		</div>
		{@render children()}
	</div>
	<Toasts active={open} />
</dialog>
