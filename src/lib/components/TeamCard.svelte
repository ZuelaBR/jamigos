<script lang="ts">
	import type { Snippet } from 'svelte';
	import Avatar from './Avatar.svelte';
	import RoleChip from './RoleChip.svelte';
	import type { Role } from '#lib/profile.ts';

	let {
		team,
		highlight = false,
		actions
	}: {
		team: {
			id: string;
			name: string;
			description: string;
			openRoles: Role[];
			status: 'open' | 'full';
			members: {
				id: string;
				username: string;
				displayName: string | null;
				avatarUrl: string | null;
			}[];
		};
		highlight?: boolean;
		actions?: Snippet;
	} = $props();
</script>

<article class="flex flex-col gap-3 card p-4 {highlight ? 'border-accent/70' : ''}">
	<header class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<a href="/teams/{team.id}" class="block truncate font-semibold hover:text-accent"
				>{team.name}</a
			>
			<p class="text-xs text-muted">
				{team.members.length}
				{team.members.length === 1 ? 'member' : 'members'}
				{#if team.status === 'full'}· <span class="text-warn">Team is full</span>{/if}
			</p>
		</div>
		<div class="flex -space-x-2">
			{#each team.members.slice(0, 5) as m (m.id)}
				<a
					href="/u/{m.username}"
					title={m.displayName || m.username}
					class="rounded-full ring-2 ring-surface"
				>
					<Avatar user={m} size={30} />
				</a>
			{/each}
		</div>
	</header>

	{#if team.openRoles.length && team.status === 'open'}
		<div class="flex flex-wrap gap-1.5">
			{#each team.openRoles as role (role)}<RoleChip {role} variant="wanted" />{/each}
		</div>
	{/if}

	{#if team.description}<p class="line-clamp-3 text-sm text-text/90">{team.description}</p>{/if}

	{#if actions}<footer class="mt-auto flex flex-wrap gap-2 pt-1">{@render actions()}</footer>{/if}
</article>
