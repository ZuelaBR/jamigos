<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { goto } from '$app/navigation';
	import { jamTiming } from '#lib/time.ts';

	type Result = {
		slug: string;
		title: string;
		coverUrl: string | null;
		startsAt: string | null;
		endsAt: string | null;
		lookingCount: number;
		teamCount: number;
	};

	let { autofocus = false, placeholder = 'Which jam are you joining? e.g. GMTK, Brackeys…' } =
		$props();

	let q = $state('');
	let results = $state<Result[]>([]);
	let open = $state(false);
	let active = $state(-1);
	let loading = $state(false);
	let timer: ReturnType<typeof setTimeout>;
	let controller: AbortController | undefined;
	const listId = 'jam-search-results';

	function onInput() {
		clearTimeout(timer);
		active = -1;
		if (q.trim().length < 2) {
			results = [];
			open = false;
			return;
		}
		timer = setTimeout(search, 150);
	}

	async function search() {
		controller?.abort();
		controller = new AbortController();
		loading = true;
		try {
			const res = await fetch(`/api/jams/search?q=${encodeURIComponent(q.trim())}`, {
				signal: controller.signal
			});
			results = await res.json();
			open = true;
		} catch {
			// Aborted by a newer keystroke, or offline: keep the previous results.
		} finally {
			loading = false;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open || !results.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = (active + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active - 1 + results.length) % results.length;
		} else if (e.key === 'Enter' && active >= 0) {
			e.preventDefault();
			goto(`/jams/${results[active].slug}`);
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	const timing = (r: Result) =>
		jamTiming({
			startsAt: r.startsAt ? new Date(r.startsAt) : null,
			endsAt: r.endsAt ? new Date(r.endsAt) : null
		});
</script>

<!-- Without JS this is a plain GET search on /jams. -->
<form
	method="GET"
	action="/jams"
	role="search"
	class="relative"
	onsubmit={(e) => active >= 0 && e.preventDefault()}
>
	<label for="jam-search" class="sr-only">Search jams</label>
	<div class="relative">
		<SearchIcon
			size={20}
			class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
			aria-hidden="true"
		/>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="jam-search"
			name="q"
			type="search"
			autocomplete="off"
			{autofocus}
			{placeholder}
			class="w-full py-3 pl-11 text-base shadow-sm"
			bind:value={q}
			oninput={onInput}
			onkeydown={onKeydown}
			onfocus={() => results.length && (open = true)}
			onblur={() => setTimeout(() => (open = false), 150)}
			role="combobox"
			aria-expanded={open}
			aria-controls={listId}
			aria-autocomplete="list"
			aria-activedescendant={active >= 0 ? `jam-opt-${active}` : undefined}
		/>
	</div>

	{#if open}
		<ul
			id={listId}
			role="listbox"
			class="absolute inset-x-0 z-30 mt-1 max-h-[22rem] overflow-auto card py-1 text-left shadow-xl"
		>
			{#each results as r, i (r.slug)}
				{@const t = timing(r)}
				<li id="jam-opt-{i}" role="option" aria-selected={i === active}>
					<a
						href="/jams/{r.slug}"
						class="flex items-center gap-3 px-3 py-2 {i === active
							? 'bg-surface-2'
							: 'hover:bg-surface-2'}"
						onmouseenter={() => (active = i)}
					>
						<span class="h-10 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
							{#if r.coverUrl}<img
									src={r.coverUrl}
									alt=""
									class="h-full w-full object-cover"
									loading="lazy"
								/>{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate font-bold">{r.title}</span>
							<span class="block text-xs {t.live ? 'text-ok' : 'text-muted'}">{t.label}</span>
						</span>
						{#if r.lookingCount || r.teamCount}
							<span class="shrink-0 text-right text-xs font-bold text-accent">
								{#if r.lookingCount}{r.lookingCount} looking{/if}{#if r.lookingCount && r.teamCount}<br
									/>{/if}{#if r.teamCount}{r.teamCount} {r.teamCount === 1 ? 'team' : 'teams'}{/if}
							</span>
						{/if}
					</a>
				</li>
			{:else}
				<li class="px-3 py-3 text-sm text-muted">
					No jam matches "{q}".
					<a class="link" href="/jams?q={encodeURIComponent(q)}">Search all jams</a> or add it by link.
				</li>
			{/each}
		</ul>
	{/if}
	<p class="sr-only" aria-live="polite">
		{loading ? 'Searching…' : open ? `${results.length} jams found` : ''}
	</p>
</form>
