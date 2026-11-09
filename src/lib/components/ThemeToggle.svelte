<script lang="ts">
	import { applyTheme, type Theme } from '#lib/theme.ts';

	let { initial }: { initial: Theme } = $props();

	// svelte-ignore state_referenced_locally
	let theme = $state<Theme>(initial);
	let open = $state(false);

	const options: { id: Theme; label: string }[] = [
		{ id: 'light', label: 'Light' },
		{ id: 'dark', label: 'Dark' },
		{ id: 'system', label: 'System' }
	];

	function choose(id: Theme) {
		theme = id;
		applyTheme(id);
		open = false;
	}
</script>

{#snippet icon(id: Theme)}
	<svg
		viewBox="0 0 24 24"
		width="18"
		height="18"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{#if id === 'light'}
			<circle cx="12" cy="12" r="4" /><path
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		{:else if id === 'dark'}
			<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
		{:else}
			<rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" />
		{/if}
	</svg>
{/snippet}

<svelte:window
	onclick={() => (open = false)}
	onkeydown={(e) => e.key === 'Escape' && (open = false)}
/>

<div class="relative">
	<button
		type="button"
		class="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Theme: {theme}"
		title="Theme"
		onclick={(e) => {
			e.stopPropagation();
			open = !open;
		}}
	>
		{@render icon(theme)}
	</button>
	{#if open}
		<div
			role="menu"
			tabindex="-1"
			class="absolute right-0 z-50 mt-1 w-36 card py-1 shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
		>
			{#each options as o (o.id)}
				<button
					type="button"
					role="menuitemradio"
					aria-checked={theme === o.id}
					class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-surface-2 {theme ===
					o.id
						? 'font-bold text-accent'
						: ''}"
					onclick={() => choose(o.id)}
				>
					{@render icon(o.id)}
					{o.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
