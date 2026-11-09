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

<div class="flex flex-wrap items-center gap-1.5 field">
	{#each value as tag (tag)}
		<span
			class="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-bold"
		>
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
		class="min-w-32 flex-1 border-0 bg-transparent p-0 shadow-none focus:shadow-none"
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
			<button type="button" class="choice" onclick={() => add(s)}>
				+ {s}
			</button>
		{/each}
	</div>
{/if}
