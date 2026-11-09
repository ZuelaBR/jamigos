<script lang="ts">
	import { fly } from 'svelte/transition';
	import { dismiss, toasts } from '#lib/toast.svelte.ts';
</script>

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
			<span aria-hidden="true" class={t.kind === 'error' ? 'text-accent' : 'text-ok'}
				>{t.kind === 'error' ? '⚠' : '✓'}</span
			>
			{t.message}
		</button>
	{/each}
</div>
