<script lang="ts">
	import { enhance } from '$app/forms';
	import Avatar from '#lib/components/Avatar.svelte';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import Mail from '@lucide/svelte/icons/mail';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import RoleChip from '#lib/components/RoleChip.svelte';
	import { withToasts } from '#lib/forms.ts';
	import { relativeTime } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Inbox · Jamigos</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<h1 class="text-2xl font-bold">Inbox</h1>

	<h2 class="mt-8 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
		Waiting for you
	</h2>
	{#if data.incoming.length}
		<ul class="space-y-3">
			{#each data.incoming as item (item.id)}
				<li class="flex flex-col gap-3 card p-4 sm:flex-row sm:items-center">
					<div class="flex min-w-0 flex-1 items-start gap-3">
						{#if item.kind === 'request'}
							<a href="/u/{item.user.username}"><Avatar user={item.user} size={40} /></a>
							<div class="min-w-0">
								<p class="text-sm">
									<a href="/u/{item.user.username}" class="font-semibold hover:text-accent"
										>{item.user.displayName || item.user.username}</a
									>
									wants to join
									<a href="/teams/{item.team.id}" class="font-semibold hover:text-accent"
										>{item.team.name}</a
									>
								</p>
								<p class="text-xs text-muted">{item.jam.title} · {relativeTime(item.createdAt)}</p>
								<div class="mt-1.5 flex flex-wrap gap-1">
									{#each item.user.roles as role (role)}<RoleChip {role} />{/each}
								</div>
							</div>
						{:else}
							<span
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"
								aria-hidden="true"><Mail size={18} /></span
							>
							<div class="min-w-0">
								<p class="text-sm">
									You're invited to join <a
										href="/teams/{item.team.id}"
										class="font-semibold hover:text-accent">{item.team.name}</a
									>
								</p>
								<p class="text-xs text-muted">{item.jam.title} · {relativeTime(item.createdAt)}</p>
							</div>
						{/if}
					</div>
					{#if item.message}<p class="rounded-lg bg-surface-2 p-2 text-sm sm:max-w-56">
							"{item.message}"
						</p>{/if}
					<form method="POST" action="?/respond" class="flex gap-2" use:enhance={withToasts()}>
						<input type="hidden" name="requestId" value={item.id} />
						<button class="btn-primary btn-sm" name="accept" value="1">Accept</button>
						<button class="btn-ghost btn-sm" name="accept" value="0">Decline</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState icon={InboxIcon} title="You're all caught up">
			Invites and join requests for your teams will show up here. <a
				class="text-accent hover:underline"
				href="/jams">Browse jams</a
			>
		</EmptyState>
	{/if}

	{#if data.outgoing.length}
		<h2 class="mt-10 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">Sent by you</h2>
		<ul class="divide-y divide-border card">
			{#each data.outgoing as item (item.id)}
				<li class="flex items-center gap-3 px-4 py-3 text-sm">
					<span class="flex-1">
						{#if item.kind === 'request'}
							Asked to join <a href="/teams/{item.team.id}" class="font-medium hover:text-accent"
								>{item.team.name}</a
							>
						{:else}
							Invited <a href="/u/{item.user.username}" class="font-medium hover:text-accent"
								>{item.user.displayName || item.user.username}</a
							>
							to
							<a href="/teams/{item.team.id}" class="font-medium hover:text-accent"
								>{item.team.name}</a
							>
						{/if}
						<span class="text-xs text-muted"
							>· {item.jam.title} · {relativeTime(item.createdAt)}</span
						>
					</span>
					<form method="POST" action="?/cancel" use:enhance={withToasts()}>
						<input type="hidden" name="requestId" value={item.id} />
						<button class="text-xs text-muted hover:text-accent"
							>{item.kind === 'request' ? 'Withdraw' : 'Cancel'}</button
						>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</div>
