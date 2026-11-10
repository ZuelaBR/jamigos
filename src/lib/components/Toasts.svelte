<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import { fly } from 'svelte/transition';
	import { dismiss, toasts } from '#lib/toast.svelte.ts';
	let { active = true }: { active?: boolean } = $props();
</script>

{#if active}
	<div
		class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
		aria-live="polite"
	>
		{#each toasts as t (t.id)}
			<button
				type="button"
				transition:fly={{ y: 16, duration: 180 }}
				onclick={() => dismiss(t.id)}
				class="pointer-events-auto flex max-w-md items-center gap-2 rounded-md border border-l-4 border-border bg-surface px-4 py-2.5 text-sm font-bold text-text shadow-lg {t.kind ===
				'error'
					? 'border-l-accent'
					: 'border-l-ok'}"
			>
				{#if t.kind === 'error'}
					<CircleAlert size={18} class="shrink-0 text-accent" aria-hidden="true" />
				{:else}
					<CircleCheck size={18} class="shrink-0 text-ok" aria-hidden="true" />
				{/if}
				{t.message}
			</button>
		{/each}
	</div>
{/if}
