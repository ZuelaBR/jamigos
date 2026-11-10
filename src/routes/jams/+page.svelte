<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Search from '@lucide/svelte/icons/search';
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
	onDestroy(() => clearTimeout(searchTimer));
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
	{#if !data.user}
		<div class="mt-4 flex card flex-wrap items-center justify-between gap-3 p-4">
			<p>Sign in to add a jam by its itch.io link.</p>
			<a href="/login?next=%2Fjams" class="btn-primary">Sign in with itch.io</a>
		</div>
	{:else}
		<form
			method="POST"
			action="?/add"
			class="mt-4 flex card flex-col gap-3 p-4 sm:flex-row sm:items-start"
			use:enhance={() => {
				adding = true;
				return async ({ result, update }) => {
					adding = false;
					if (result.type === 'failure')
						toast(String(result.data?.message ?? 'Could not add that jam.'), 'error');
					if (result.type === 'error')
						toast(result.error.message ?? 'Could not add that jam. Please try again.', 'error');
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
{/if}

<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
	<nav class="flex rounded-lg border border-border p-1" aria-label="Jam timing">
		{#each tabs as t (t.id)}
			<a
				aria-current={data.filters.tab === t.id ? 'page' : undefined}
				href={href({ tab: t.id === 'running' ? null : t.id })}
				class="rounded-md px-3 py-1.5 text-sm font-medium {data.filters.tab === t.id
					? 'bg-surface-2 text-text'
					: 'text-muted hover:text-text'}"
			>
				{t.label}
			</a>
		{/each}
	</nav>
	<form
		method="GET"
		action="/jams"
		class="w-full sm:max-w-xs"
		onsubmit={() => clearTimeout(searchTimer)}
	>
		<input type="hidden" name="tab" value={data.filters.tab} />
		<input type="hidden" name="sort" value={data.filters.sort} />
		<input
			name="q"
			type="search"
			placeholder="Search jams…"
			value={data.filters.q}
			oninput={onSearch}
			class="w-full"
			aria-label="Search jams"
		/>
		<button class="sr-only focus:not-sr-only">Search</button>
	</form>
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
	<div class="mt-6 card-grid">
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
			icon={Search}
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
