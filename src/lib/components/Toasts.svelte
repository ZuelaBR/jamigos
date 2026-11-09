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
			class="pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg {t.kind ===
			'error'
				? 'border-accent/50 bg-[#3a1f22] text-[#ffd0d0]'
				: 'border-ok/40 bg-[#1b2e22] text-[#c9f7d8]'}"
		>
			<span aria-hidden="true">{t.kind === 'error' ? '⚠️' : '✓'}</span>
			{t.message}
		</button>
	{/each}
</div>
