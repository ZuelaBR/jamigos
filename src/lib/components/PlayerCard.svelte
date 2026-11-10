<script lang="ts">
	import Wrench from '@lucide/svelte/icons/wrench';
	import UserRoundSearch from '@lucide/svelte/icons/user-round-search';
	import type { Snippet } from 'svelte';
	import Avatar from './Avatar.svelte';
	import OverlapBadge from './OverlapBadge.svelte';
	import RoleChip from './RoleChip.svelte';
	import { EXPERIENCE_LABELS, type Experience, type Role } from '#lib/profile.ts';
	import { relativeTime } from '#lib/time.ts';

	let {
		user,
		roles,
		message,
		updatedAt,
		viewerTimezone,
		showType = false,
		actions
	}: {
		user: {
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
			experience: Experience;
			timezone: string;
			tools: string[];
		};
		roles: Role[];
		message: string;
		updatedAt: Date;
		viewerTimezone?: string | null;
		showType?: boolean;
		actions?: Snippet;
	} = $props();
</script>

<article
	class="card-content h-full card"
	aria-label={showType ? `Person: ${user.displayName || user.username}` : undefined}
>
	{#if showType}
		<div class="flex flex-wrap items-center gap-2 text-xs">
			<span class="inline-flex items-center gap-1 rounded-sm bg-surface-2 px-2 py-1 font-bold"
				><UserRoundSearch size={13} aria-hidden="true" />Person</span
			>
			<span class="text-muted">Looking for a team</span>
		</div>
	{/if}
	<header class="flex items-start gap-3">
		<a href="/u/{user.username}" class="shrink-0"><Avatar {user} size={44} /></a>
		<div class="min-w-0 flex-1">
			<a href="/u/{user.username}" class="block truncate font-semibold hover:text-accent"
				>{user.displayName || user.username}</a
			>
			<div class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
				<span>{EXPERIENCE_LABELS[user.experience]}</span>
				<span aria-hidden="true">·</span>
				<OverlapBadge timezone={user.timezone} {viewerTimezone} />
			</div>
		</div>
		<time class="shrink-0 text-xs text-muted" datetime={updatedAt.toISOString()}
			>{relativeTime(updatedAt)}</time
		>
	</header>

	<div class="flex flex-wrap gap-1.5">
		{#each roles as role (role)}<RoleChip {role} />{/each}
	</div>

	{#if message}<p class="line-clamp-3 text-sm whitespace-pre-line text-text/90">{message}</p>{/if}

	{#if user.tools.length}
		<p class="flex items-center gap-1.5 text-xs text-muted" title={user.tools.join(', ')}>
			<Wrench size={13} class="shrink-0" aria-hidden="true" /><span class="truncate"
				>{user.tools.join(' · ')}</span
			>
		</p>
	{/if}

	{#if actions}<footer class="card-actions">{@render actions()}</footer>{/if}
</article>
