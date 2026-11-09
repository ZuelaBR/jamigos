<script lang="ts">
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
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
	{#if id === 'light'}<Sun size={18} aria-hidden="true" />
	{:else if id === 'dark'}<Moon size={18} aria-hidden="true" />
	{:else}<Monitor size={18} aria-hidden="true" />{/if}
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
