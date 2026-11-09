<script lang="ts">
	import type { Snippet } from 'svelte';

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

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={close}
	onclick={(e) => e.target === dialog && close()}
	class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
	aria-labelledby="modal-title"
>
	<div class="p-5 sm:p-6">
		<div class="mb-4 flex items-start justify-between gap-4">
			<h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
			<button
				type="button"
				class="-m-1 p-1 text-xl leading-none text-muted hover:text-text"
				aria-label="Close"
				onclick={close}>×</button
			>
		</div>
		{@render children()}
	</div>
</dialog>
