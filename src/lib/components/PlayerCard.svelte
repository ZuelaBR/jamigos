<script lang="ts">
	import Wrench from '@lucide/svelte/icons/wrench';
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
		actions?: Snippet;
	} = $props();
</script>

<article class="flex flex-col gap-3 card p-4">
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

	{#if message}<p class="line-clamp-4 text-sm whitespace-pre-line text-text/90">{message}</p>{/if}

	{#if user.tools.length}
		<p class="flex items-center gap-1.5 text-xs text-muted" title={user.tools.join(', ')}>
			<Wrench size={13} class="shrink-0" aria-hidden="true" /><span class="truncate"
				>{user.tools.join(' · ')}</span
			>
		</p>
	{/if}

	{#if actions}<footer class="mt-auto flex flex-wrap gap-2 pt-1">{@render actions()}</footer>{/if}
</article>
