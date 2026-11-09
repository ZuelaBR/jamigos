<script lang="ts">
	import { jamTiming } from '#lib/time.ts';

	let {
		jam
	}: {
		jam: {
			slug: string;
			title: string;
			hostName: string | null;
			coverUrl: string | null;
			startsAt: Date | null;
			endsAt: Date | null;
			joinedCount: number;
			lookingCount: number;
			teamCount: number;
		};
	} = $props();

	const timing = $derived(jamTiming(jam));
</script>

<a
	href="/jams/{jam.slug}"
	class="group flex gap-4 card p-3 transition-colors hover:border-accent/60 hover:bg-surface-2"
>
	<div class="h-[84px] w-[106px] shrink-0 overflow-hidden rounded-lg bg-surface-2">
		{#if jam.coverUrl}
			<img
				src={jam.coverUrl}
				alt=""
				loading="lazy"
				class="h-full w-full object-cover transition-transform group-hover:scale-105"
			/>
		{:else}
			<div class="flex h-full items-center justify-center text-3xl" aria-hidden="true">🕹️</div>
		{/if}
	</div>
	<div class="flex min-w-0 flex-1 flex-col">
		<h3 class="line-clamp-2 leading-snug font-semibold group-hover:text-accent">{jam.title}</h3>
		{#if jam.hostName}<p class="truncate text-xs text-muted">by {jam.hostName}</p>{/if}
		<p class="mt-1 flex items-center gap-1.5 text-xs {timing.live ? 'text-ok' : 'text-muted'}">
			{#if timing.live}<span class="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true"></span>{/if}
			{timing.label}
		</p>
		<div class="mt-auto flex flex-wrap gap-x-3 pt-1 text-xs text-muted">
			<span>{jam.joinedCount.toLocaleString('en')} joined</span>
			{#if jam.lookingCount}<span class="text-text">🙋 {jam.lookingCount} looking</span>{/if}
			{#if jam.teamCount}<span class="text-text"
					>👥 {jam.teamCount} {jam.teamCount === 1 ? 'team' : 'teams'}</span
				>{/if}
		</div>
	</div>
</a>
