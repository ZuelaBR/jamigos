<script lang="ts">
	import type { Snippet } from 'svelte';

	let { icon, title, children }: { icon: string; title: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center gap-3 card px-6 py-12 text-center">
	<span class="text-4xl" aria-hidden="true">{icon}</span>
	<h3 class="text-lg font-semibold">{title}</h3>
	{#if children}
		<div class="max-w-md text-sm text-muted">{@render children()}</div>
	{/if}
</div>
