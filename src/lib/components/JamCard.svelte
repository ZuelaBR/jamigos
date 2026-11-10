<script lang="ts">
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
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
	class="group flex h-full card gap-3 p-4 transition-colors hover:border-accent/60 hover:bg-surface-2"
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
			<div class="flex h-full items-center justify-center text-muted" aria-hidden="true">
				<Gamepad2 size={32} strokeWidth={1.5} />
			</div>
		{/if}
	</div>
	<div class="flex min-w-0 flex-1 flex-col">
		<h3 class="line-clamp-2 leading-snug font-semibold group-hover:text-accent">{jam.title}</h3>
		{#if jam.hostName}<p class="truncate text-xs text-muted">by {jam.hostName}</p>{/if}
		<p class="mt-1 flex items-center gap-1.5 text-xs {timing.live ? 'text-ok' : 'text-muted'}">
			{#if timing.live}<span class="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true"></span>{/if}
			{timing.label}
		</p>
		<!-- Jamigos activity first (that's why you're here); itch.io's count is secondary. -->
		<div class="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1.5 text-xs">
			{#if jam.lookingCount || jam.teamCount}
				<span class="font-bold text-accent">
					{[
						jam.lookingCount && `${jam.lookingCount} looking`,
						jam.teamCount && `${jam.teamCount} ${jam.teamCount === 1 ? 'team' : 'teams'}`
					]
						.filter(Boolean)
						.join(' · ')}
				</span>
			{:else}
				<span class="text-muted">No one here yet. Be the first!</span>
			{/if}
			<span class="text-muted">· {jam.joinedCount.toLocaleString('en')} on itch.io</span>
		</div>
	</div>
</a>
