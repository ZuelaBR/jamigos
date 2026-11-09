<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import JamCard from '#lib/components/JamCard.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let adding = $state(false);
	let showAdd = $state(false);

	function href(changes: Record<string, string | number | null>) {
		// Throwaway copy used to build a URL, not reactive state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams(page.url.search);
		for (const [k, v] of Object.entries(changes)) {
			if (v === null || v === '') params.delete(k);
			else params.set(k, String(v));
		}
		if (!('page' in changes)) params.delete('page');
		const qs = params.toString();
		return `/jams${qs ? `?${qs}` : ''}`;
	}

	let searchTimer: ReturnType<typeof setTimeout>;
	function onSearch(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => goto(href({ q: value }), { reset: false, replace: true }), 250);
	}

	const tabs = [
		{ id: 'running', label: 'Happening now' },
		{ id: 'upcoming', label: 'Starting soon' }
	] as const;
	const sorts = $derived([
		{ id: 'active', label: 'Most teammates looking' },
		{ id: 'soon', label: data.filters.tab === 'running' ? 'Closing soonest' : 'Starting soonest' },
		{ id: 'popular', label: 'Most popular on itch.io' }
	] as const);
</script>

<svelte:head><title>Browse game jams · Jamigos</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<h1 class="text-2xl font-bold sm:text-3xl">Find a jam</h1>
		<p class="mt-1 text-muted">Pick a jam to see who's looking for a team.</p>
	</div>
	<button class="btn-ghost btn-sm" onclick={() => (showAdd = !showAdd)} aria-expanded={showAdd}>
		+ Jam not listed?
	</button>
</div>

{#if showAdd || form?.message}
	<form
		method="POST"
		action="?/add"
		class="mt-4 flex flex-col gap-3 card p-4 sm:flex-row sm:items-start"
		use:enhance={() => {
			adding = true;
			return async ({ result, update }) => {
				adding = false;
				if (result.type === 'failure')
					toast(String(result.data?.message ?? 'Could not add that jam.'), 'error');
				if (result.type === 'error') toast('Please sign in to add a jam.', 'error');
				await update({ reset: false, navigate: false });
			};
		}}
	>
		<div class="flex-1">
			<label for="jam-url" class="sr-only">itch.io jam link</label>
			<input
				id="jam-url"
				name="url"
				class="w-full"
				placeholder="https://itch.io/jam/your-jam"
				value={form?.url ?? ''}
				required
			/>
			{#if form?.message}<p class="field-error">{form.message}</p>{/if}
			<p class="hint">
				Unlisted or brand-new jams can be added by link. Popular jams are imported automatically.
			</p>
		</div>
		<button class="btn-primary" disabled={adding}>{adding ? 'Looking it up…' : 'Add jam'}</button>
	</form>
{/if}

<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
	<div class="flex rounded-lg border border-border p-1" role="tablist">
		{#each tabs as t (t.id)}
			<a
				role="tab"
				aria-selected={data.filters.tab === t.id}
				href={href({ tab: t.id === 'running' ? null : t.id })}
				class="rounded-md px-3 py-1.5 text-sm font-medium {data.filters.tab === t.id
					? 'bg-surface-2 text-text'
					: 'text-muted hover:text-text'}"
			>
				{t.label}
			</a>
		{/each}
	</div>
	<input
		type="search"
		placeholder="Search jams…"
		value={data.filters.q}
		oninput={onSearch}
		class="w-full sm:max-w-xs"
		aria-label="Search jams"
	/>
	<select
		class="sm:ml-auto"
		aria-label="Sort jams"
		value={data.filters.sort}
		onchange={(e) =>
			goto(href({ sort: e.currentTarget.value === 'active' ? null : e.currentTarget.value }), {
				reset: false
			})}
	>
		{#each sorts as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
	</select>
</div>

{#if data.filters.q}
	<p class="mt-3 text-sm text-muted">Showing matches from all current and upcoming jams.</p>
{/if}

{#if data.jams.length}
	<div class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
		{#each data.jams as jam (jam.id)}<JamCard {jam} />{/each}
	</div>
	<div class="mt-8 flex justify-center gap-3">
		{#if data.filters.page > 1}
			<a class="btn-ghost" href={href({ page: data.filters.page - 1 })}>← Previous</a>
		{/if}
		{#if data.hasMore}
			<a class="btn-ghost" href={href({ page: data.filters.page + 1 })}>Next →</a>
		{/if}
	</div>
{:else}
	<div class="mt-6">
		<EmptyState
			icon="🔍"
			title={data.filters.q ? `No jams match "${data.filters.q}"` : 'No jams here yet'}
		>
			{#if data.filters.q}
				Try another search, or add the jam by pasting its itch.io link.
			{:else}
				Jams are imported from itch.io every few hours. You can also add one by link.
			{/if}
		</EmptyState>
	</div>
{/if}
