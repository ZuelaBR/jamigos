<script lang="ts">
	let {
		name,
		value = $bindable([]),
		suggestions = [],
		max = 12,
		placeholder = 'Type and press Enter'
	}: {
		name: string;
		value?: string[];
		suggestions?: string[];
		max?: number;
		placeholder?: string;
	} = $props();

	let draft = $state('');
	const listId = $derived(`${name}-suggestions`);
	const remaining = $derived(
		suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
	);

	function add(raw: string) {
		const tag = raw.trim().slice(0, 30);
		if (!tag || value.length >= max) return;
		if (!value.some((v) => v.toLowerCase() === tag.toLowerCase())) value = [...value, tag];
		draft = '';
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			add(draft);
		} else if (e.key === 'Backspace' && !draft && value.length) {
			value = value.slice(0, -1);
		}
	}
</script>

<div
	class="flex flex-wrap gap-2 rounded-lg border border-border bg-surface-2 p-2 focus-within:border-accent"
>
	{#each value as tag (tag)}
		<span class="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs">
			{tag}
			<button
				type="button"
				class="text-muted hover:text-text"
				aria-label="Remove {tag}"
				onclick={() => (value = value.filter((t) => t !== tag))}>×</button
			>
			<input type="hidden" {name} value={tag} />
		</span>
	{/each}
	<input
		class="min-w-32 flex-1 border-0 bg-transparent p-1 text-sm focus:ring-0"
		list={listId}
		bind:value={draft}
		{onkeydown}
		onchange={() => suggestions.includes(draft) && add(draft)}
		onblur={() => add(draft)}
		placeholder={value.length >= max ? `Max ${max}` : placeholder}
		disabled={value.length >= max}
		aria-label="Add a tool"
	/>
	<datalist id={listId}>
		{#each remaining as s (s)}<option value={s}></option>{/each}
	</datalist>
</div>
{#if remaining.length && value.length < max}
	<div class="mt-2 flex flex-wrap gap-1.5">
		{#each remaining.slice(0, 10) as s (s)}
			<button
				type="button"
				class="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-text"
				onclick={() => add(s)}
			>
				+ {s}
			</button>
		{/each}
	</div>
{/if}
