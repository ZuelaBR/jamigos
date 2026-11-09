<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import OverlapBadge from '#lib/components/OverlapBadge.svelte';
	import RoleChip from '#lib/components/RoleChip.svelte';
	import { EXPERIENCE_LABELS } from '#lib/profile.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.profile);
	const loginHref = $derived(`/login?next=${encodeURIComponent(`/u/${p.username}`)}`);

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toast('Copied to clipboard.');
	}
</script>

<svelte:head><title>{p.displayName || p.username} · Jammer profile</title></svelte:head>

<div class="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_280px]">
	<section class="card p-6">
		<div class="flex items-start gap-4">
			<Avatar user={p} size={72} />
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-2xl font-bold">{p.displayName || p.username}</h1>
				<a
					href={p.itchUrl}
					target="_blank"
					rel="noopener"
					class="text-sm text-muted hover:text-accent"
				>
					@{p.username} on itch.io ↗
				</a>
				<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
					<span class="text-xs text-muted">🏅 {EXPERIENCE_LABELS[p.experience]}</span>
					<OverlapBadge
						timezone={p.timezone}
						viewerTimezone={data.isMe ? null : data.user?.timezone}
					/>
				</div>
			</div>
			{#if data.isMe}
				<a href="/settings" class="btn-ghost btn-sm">Edit</a>
			{/if}
		</div>

		<div class="mt-6 flex flex-wrap gap-2">
			{#each p.roles as role (role)}<RoleChip {role} />{/each}
		</div>

		{#if p.bio}
			<p class="mt-6 whitespace-pre-line text-text/90">{p.bio}</p>
		{/if}

		{#if p.tools.length}
			<h2 class="mt-6 mb-2 text-sm font-semibold text-muted">Tools</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each p.tools as tool (tool)}
					<span class="rounded-md bg-surface-2 px-2 py-0.5 text-xs">{tool}</span>
				{/each}
			</div>
		{/if}

		{#if p.links.length}
			<h2 class="mt-6 mb-2 text-sm font-semibold text-muted">Portfolio</h2>
			<ul class="space-y-1 text-sm">
				{#each p.links as link (link)}
					<li>
						<a
							href={link}
							target="_blank"
							rel="noopener nofollow ugc"
							class="text-accent hover:underline">{link.replace(/^https?:\/\//, '')}</a
						>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<aside class="space-y-4">
		<div class="card p-5">
			<h2 class="mb-3 font-semibold">Get in touch</h2>
			{#if !data.showContact}
				<p class="text-sm text-muted">
					Sign in to see how to contact {p.displayName || p.username}.
				</p>
				<a href={loginHref} class="mt-3 btn-primary w-full btn-sm">Sign in with itch.io</a>
			{:else}
				<ul class="space-y-2 text-sm">
					{#if p.contactDiscord}
						<li class="flex items-center justify-between gap-2">
							<span><span class="text-muted">Discord</span> · {p.contactDiscord}</span>
							<button class="btn-ghost btn-sm" onclick={() => copy(p.contactDiscord!)}>Copy</button>
						</li>
					{/if}
					{#if p.contactEmail}
						<li>
							<span class="text-muted">Email</span> ·
							<a class="hover:text-accent" href="mailto:{p.contactEmail}">{p.contactEmail}</a>
						</li>
					{/if}
					<li>
						<span class="text-muted">itch.io</span> ·
						<a class="hover:text-accent" href={p.itchUrl} target="_blank" rel="noopener"
							>profile ↗</a
						>
					</li>
				</ul>
			{/if}
		</div>

		{#if data.memberships.length}
			<div class="card p-5">
				<h2 class="mb-3 font-semibold">Teams</h2>
				<ul class="space-y-2 text-sm">
					{#each data.memberships as m (m.teamId)}
						<li>
							<a href="/teams/{m.teamId}" class="font-medium hover:text-accent">{m.teamName}</a>
							<div class="text-xs text-muted">{m.jamTitle}</div>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</aside>
</div>
