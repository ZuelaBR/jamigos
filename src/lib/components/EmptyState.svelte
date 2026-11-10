<script lang="ts">
	import type { Component, Snippet } from 'svelte';

	let {
		icon: Icon,
		title,
		children
	}: {
		icon: Component<{ size?: number; strokeWidth?: number; class?: string }>;
		title: string;
		children?: Snippet;
	} = $props();
</script>

<div class="flex card flex-col items-center gap-3 px-6 py-12 text-center">
	<span
		class="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent"
		aria-hidden="true"
	>
		<Icon size={26} strokeWidth={2} />
	</span>
	<h3 class="text-lg font-semibold">{title}</h3>
	{#if children}
		<div class="max-w-md text-sm text-muted">{@render children()}</div>
	{/if}
</div>
