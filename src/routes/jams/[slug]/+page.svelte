<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import PlayerCard from '#lib/components/PlayerCard.svelte';
	import RolePicker from '#lib/components/RolePicker.svelte';
	import TeamCard from '#lib/components/TeamCard.svelte';
	import { withToasts } from '#lib/forms.ts';
	import { EXPERIENCES, EXPERIENCE_LABELS, ROLES, ROLE_LABELS, type Role } from '#lib/profile.ts';
	import { formatDate, jamTiming } from '#lib/time.ts';
	import { offsetMinutes, overlapHours } from '#lib/tz.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const jam = $derived(data.jam);
	const board = $derived(data.board);
	const viewer = $derived(board.viewer);
	const timing = $derived(jamTiming(jam));
	const myTeam = $derived(board.teams.find((t) => t.id === viewer?.myTeamId));
	const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);

	// ---- Filters (kept in the URL so filtered views can be shared) ----
	const params = $derived(page.url.searchParams);
	const tab = $derived(params.get('tab') === 'teams' ? 'teams' : 'players');
	const roleFilter = $derived(
		ROLES.includes(params.get('role') as Role) ? (params.get('role') as Role) : null
	);
	const expFilter = $derived(params.get('exp'));
	const overlapOnly = $derived(params.get('overlap') === '1');
	const fitOnly = $derived(params.get('fit') === '1');

	function setParam(key: string, value: string | null) {
		// Throwaway copy used to build a URL, not reactive state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new URLSearchParams(page.url.search);
		if (value) next.set(key, value);
		else next.delete(key);
		const qs = next.toString();
		goto(`${page.url.pathname}${qs ? `?${qs}` : ''}`, { replace: true, reset: false });
	}

	const myOffset = $derived(data.me ? offsetMinutes(data.me.timezone) : null);
	const overlapsWell = (tz: string) =>
		myOffset === null || overlapHours(offsetMinutes(tz), myOffset) >= 5;

	const players = $derived(
		board.posts.filter(
			(p) =>
				p.user.id !== data.me?.id &&
				(!roleFilter || p.roles.includes(roleFilter)) &&
				(!expFilter || p.user.experience === expFilter) &&
				(!overlapOnly || overlapsWell(p.user.timezone))
		)
	);

	const fitsMe = (roles: Role[]) => !!data.me && roles.some((r) => data.me!.roles.includes(r));
	const teamsShown = $derived(
		board.teams
			.filter(
				(t) =>
					t.id !== viewer?.myTeamId &&
					(!roleFilter || t.openRoles.includes(roleFilter)) &&
					(!fitOnly || fitsMe(t.openRoles))
			)
			// Open teams that need what I can do first.
			.toSorted(
				(a, b) =>
					Number(b.status === 'open') - Number(a.status === 'open') ||
					Number(fitsMe(b.openRoles)) - Number(fitsMe(a.openRoles))
			)
	);

	// ---- Modals ----
	let lfgOpen = $state(false);
	let teamOpen = $state(false);
	let requestTeam = $state<(typeof board.teams)[number] | null>(null);
	let inviteUser = $state<(typeof board.posts)[number]['user'] | null>(null);
	let pending = $state(false);
	const setPending = (v: boolean) => (pending = v);

	// svelte-ignore state_referenced_locally
	let lfgRoles = $state<Role[]>(viewer?.myPost?.roles ?? data.me?.roles ?? []);
	let teamRoles = $state<Role[]>([]);

	const errors = $derived(form && 'errors' in form ? (form.errors as Record<string, string>) : {});
	const requestIdFor = (teamId: string) =>
		viewer?.requested.find((r) => r.teamId === teamId)?.requestId;
	const inviteIdFor = (userId: string) =>
		viewer?.invited.find((r) => r.userId === userId)?.requestId;
	const teamName = (teamId: string) => board.teams.find((t) => t.id === teamId)?.name ?? 'A team';
	const canInvite = $derived(!!viewer?.isOwner && myTeam?.status === 'open');
</script>

<svelte:head><title>{jam.title} · Find teammates</title></svelte:head>

<!-- Jam header -->
<section class="overflow-hidden card">
	<div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
		{#if jam.coverUrl}
			<img src={jam.coverUrl} alt="" class="h-24 w-32 shrink-0 rounded-lg object-cover" />
		{/if}
		<div class="min-w-0 flex-1">
			<h1 class="text-2xl leading-tight font-bold sm:text-3xl">{jam.title}</h1>
			{#if jam.hostName}<p class="text-sm text-muted">Hosted by {jam.hostName}</p>{/if}
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<span class="flex items-center gap-1.5 {timing.live ? 'text-ok' : 'text-muted'}">
					{#if timing.live}<span class="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden="true"
						></span>{/if}
					{timing.label}
				</span>
				{#if jam.startsAt && jam.endsAt}
					<span class="text-muted">{formatDate(jam.startsAt)} → {formatDate(jam.endsAt)}</span>
				{/if}
				<span class="text-muted">{jam.joinedCount.toLocaleString('en')} joined on itch.io</span>
			</div>
		</div>
		<a href={jam.url} target="_blank" rel="noopener" class="btn-ghost shrink-0 btn-sm"
			>Jam page on itch.io ↗</a
		>
	</div>

	<!-- Viewer status -->
	<div class="border-t border-border bg-surface-2/40 px-4 py-3 sm:px-6">
		{#if !data.me}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm">Looking for teammates for this jam? Sign in to post or join a team.</p>
				<a href={loginHref} class="btn-primary btn-sm">Sign in with itch.io</a>
			</div>
		{:else if myTeam}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm">
					You're on <a class="font-semibold text-accent hover:underline" href="/teams/{myTeam.id}"
						>{myTeam.name}</a
					> for this jam. 🎉
				</p>
				<a href="/teams/{myTeam.id}" class="btn-ghost btn-sm">Manage team</a>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm">
					{#if viewer?.myPost}
						✅ You're listed as <strong>looking for a team</strong>.
					{:else}
						Not on a team yet. Let others know you're available, or start your own.
					{/if}
				</p>
				<div class="flex flex-wrap gap-2">
					{#if viewer?.myPost}
						<button class="btn-ghost btn-sm" onclick={() => (lfgOpen = true)}>Edit my post</button>
						<form method="POST" action="?/unpost" use:enhance={withToasts()}>
							<button class="btn-ghost btn-sm">Remove</button>
						</form>
					{:else}
						<button class="btn-primary btn-sm" onclick={() => (lfgOpen = true)}
							>🙋 I'm looking for a team</button
						>
					{/if}
					<button class="btn-ghost btn-sm" onclick={() => (teamOpen = true)}>Start a team</button>
				</div>
			</div>
		{/if}

		{#each viewer?.invitesToMe ?? [] as invite (invite.requestId)}
			<div
				class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2"
			>
				<p class="text-sm">📨 <strong>{teamName(invite.teamId)}</strong> invited you to join!</p>
				<form method="POST" action="?/respond" class="flex gap-2" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={invite.requestId} />
					<button class="btn-primary btn-sm" name="accept" value="1">Accept</button>
					<button class="btn-ghost btn-sm" name="accept" value="0">Decline</button>
				</form>
			</div>
		{/each}
	</div>
</section>

<!-- Tabs + filters -->
<div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
	<div class="flex rounded-lg border border-border p-1" role="tablist">
		<button
			role="tab"
			aria-selected={tab === 'players'}
			onclick={() => setParam('tab', null)}
			class="rounded-md px-3 py-1.5 text-sm font-medium {tab === 'players'
				? 'bg-surface-2'
				: 'text-muted hover:text-text'}"
		>
			🙋 Looking for a team <span class="ml-1 text-muted">{board.posts.length}</span>
		</button>
		<button
			role="tab"
			aria-selected={tab === 'teams'}
			onclick={() => setParam('tab', 'teams')}
			class="rounded-md px-3 py-1.5 text-sm font-medium {tab === 'teams'
				? 'bg-surface-2'
				: 'text-muted hover:text-text'}"
		>
			👥 Teams <span class="ml-1 text-muted">{board.teams.length}</span>
		</button>
	</div>

	<div class="flex flex-wrap items-center gap-2 lg:ml-auto">
		<select
			aria-label="Filter by role"
			value={roleFilter ?? ''}
			onchange={(e) => setParam('role', e.currentTarget.value || null)}
			class="py-1.5 text-sm"
		>
			<option value="">{tab === 'teams' ? 'Needs any role' : 'Any role'}</option>
			{#each ROLES as r (r)}<option value={r}>{ROLE_LABELS[r]}</option>{/each}
		</select>
		{#if tab === 'players'}
			<select
				aria-label="Filter by experience"
				value={expFilter ?? ''}
				onchange={(e) => setParam('exp', e.currentTarget.value || null)}
				class="py-1.5 text-sm"
			>
				<option value="">Any experience</option>
				{#each EXPERIENCES as x (x)}<option value={x}>{EXPERIENCE_LABELS[x]}</option>{/each}
			</select>
			{#if data.me}
				<label class="flex cursor-pointer items-center gap-2 text-sm text-muted">
					<input
						type="checkbox"
						class="rounded"
						checked={overlapOnly}
						onchange={(e) => setParam('overlap', e.currentTarget.checked ? '1' : null)}
					/>
					Good timezone overlap
				</label>
			{/if}
		{:else if data.me}
			<label class="flex cursor-pointer items-center gap-2 text-sm text-muted">
				<input
					type="checkbox"
					class="rounded"
					checked={fitOnly}
					onchange={(e) => setParam('fit', e.currentTarget.checked ? '1' : null)}
				/>
				Needs my skills
			</label>
		{/if}
	</div>
</div>

<!-- Lists -->
<div class="mt-4">
	{#if tab === 'players'}
		{#if players.length}
			<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
				{#each players as post (post.id)}
					<PlayerCard
						user={post.user}
						roles={post.roles}
						message={post.message}
						updatedAt={post.updatedAt}
						viewerTimezone={data.me?.timezone}
					>
						{#snippet actions()}
							<a href="/u/{post.user.username}" class="btn-ghost btn-sm">View profile</a>
							{#if canInvite && myTeam}
								{@const inviteId = inviteIdFor(post.user.id)}
								{#if inviteId}
									<form method="POST" action="?/cancel" use:enhance={withToasts()}>
										<input type="hidden" name="requestId" value={inviteId} />
										<button class="btn-ghost btn-sm" title="Cancel invite">✓ Invited · Undo</button>
									</form>
								{:else}
									<button class="btn-primary btn-sm" onclick={() => (inviteUser = post.user)}
										>Invite to {myTeam.name}</button
									>
								{/if}
							{/if}
						{/snippet}
					</PlayerCard>
				{/each}
			</div>
		{:else}
			<EmptyState
				icon="🙋"
				title={board.posts.length ? 'Nobody matches these filters' : 'Nobody is looking yet'}
			>
				{#if board.posts.length}
					Try removing a filter.
				{:else}
					Be the first! Post that you're available and teams will find you.
				{/if}
			</EmptyState>
		{/if}
	{:else if teamsShown.length}
		<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each teamsShown as team (team.id)}
				<TeamCard {team} highlight={fitsMe(team.openRoles) && team.status === 'open'}>
					{#snippet actions()}
						<a href="/teams/{team.id}" class="btn-ghost btn-sm">View team</a>
						{#if data.me && !viewer?.myTeamId && team.status === 'open'}
							{@const requestId = requestIdFor(team.id)}
							{#if requestId}
								<form method="POST" action="?/cancel" use:enhance={withToasts()}>
									<input type="hidden" name="requestId" value={requestId} />
									<button class="btn-ghost btn-sm" title="Withdraw request"
										>✓ Requested · Undo</button
									>
								</form>
							{:else}
								<button class="btn-primary btn-sm" onclick={() => (requestTeam = team)}
									>Ask to join</button
								>
							{/if}
						{/if}
					{/snippet}
				</TeamCard>
			{/each}
		</div>
	{:else}
		<EmptyState
			icon="👥"
			title={board.teams.length ? 'No teams match these filters' : 'No teams yet'}
		>
			{#if board.teams.length}
				Try removing a filter.
			{:else}
				Start a team, list the roles you need, and invite people from the "Looking for a team" tab.
			{/if}
		</EmptyState>
	{/if}
</div>

<!-- LFG post modal -->
<Modal
	bind:open={lfgOpen}
	title={viewer?.myPost ? 'Edit your post' : "Tell teams you're available"}
>
	<form
		method="POST"
		action="?/post"
		class="space-y-4"
		use:enhance={withToasts({ pending: setPending, onSuccess: () => (lfgOpen = false) })}
	>
		<div>
			<span class="label">For this jam I can do…</span>
			<RolePicker name="roles" bind:selected={lfgRoles} />
			{#if errors.roles}<p class="field-error">{errors.roles}</p>{/if}
		</div>
		<div>
			<label class="label" for="lfg-message">Anything teams should know?</label>
			<textarea
				id="lfg-message"
				name="message"
				rows="3"
				maxlength="300"
				class="w-full"
				placeholder="Hoping to make a small puzzle game. Free all weekend, evenings CET."
				>{viewer?.myPost?.message ?? ''}</textarea
			>
			{#if errors.message}<p class="field-error">{errors.message}</p>{/if}
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" class="btn-ghost" onclick={() => (lfgOpen = false)}>Cancel</button>
			<button class="btn-primary" disabled={pending}>{viewer?.myPost ? 'Save' : 'Post'}</button>
		</div>
	</form>
</Modal>

<!-- Create team modal -->
<Modal bind:open={teamOpen} title="Start a team">
	<form
		method="POST"
		action="?/createTeam"
		class="space-y-4"
		use:enhance={withToasts({ pending: setPending })}
	>
		<div>
			<label class="label" for="team-name">Team name</label>
			<input
				id="team-name"
				name="name"
				required
				minlength="2"
				maxlength="60"
				class="w-full"
				placeholder="Night Owls"
			/>
			{#if errors.name}<p class="field-error">{errors.name}</p>{/if}
		</div>
		<div>
			<span class="label">Who are you looking for?</span>
			<RolePicker name="openRoles" bind:selected={teamRoles} />
		</div>
		<div>
			<label class="label" for="team-desc"
				>Pitch <span class="font-normal text-muted">(optional)</span></label
			>
			<textarea
				id="team-desc"
				name="description"
				rows="3"
				maxlength="500"
				class="w-full"
				placeholder="Chill team, aiming for a short narrative game in Godot."></textarea>
		</div>
		<p class="hint">Creating a team removes your "looking for a team" post for this jam.</p>
		<div class="flex justify-end gap-2">
			<button type="button" class="btn-ghost" onclick={() => (teamOpen = false)}>Cancel</button>
			<button class="btn-primary" disabled={pending}>Create team</button>
		</div>
	</form>
</Modal>

<!-- Ask to join modal -->
<Modal
	open={!!requestTeam}
	onclose={() => (requestTeam = null)}
	title="Ask to join {requestTeam?.name ?? ''}"
>
	{#if requestTeam}
		<form
			method="POST"
			action="?/requestJoin"
			class="space-y-4"
			use:enhance={withToasts({ pending: setPending, onSuccess: () => (requestTeam = null) })}
		>
			<input type="hidden" name="teamId" value={requestTeam.id} />
			<div>
				<label class="label" for="req-message"
					>Say hi <span class="font-normal text-muted">(optional)</span></label
				>
				<textarea
					id="req-message"
					name="message"
					rows="3"
					maxlength="300"
					class="w-full"
					placeholder="Hi! I'm an artist and love your idea."></textarea>
			</div>
			<p class="hint">They'll see your profile and contact details.</p>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn-ghost" onclick={() => (requestTeam = null)}>Cancel</button>
				<button class="btn-primary" disabled={pending}>Send request</button>
			</div>
		</form>
	{/if}
</Modal>

<!-- Invite modal -->
<Modal
	open={!!inviteUser}
	onclose={() => (inviteUser = null)}
	title="Invite {inviteUser?.displayName || inviteUser?.username || ''}"
>
	{#if inviteUser && myTeam}
		<form
			method="POST"
			action="?/invite"
			class="space-y-4"
			use:enhance={withToasts({ pending: setPending, onSuccess: () => (inviteUser = null) })}
		>
			<input type="hidden" name="teamId" value={myTeam.id} />
			<input type="hidden" name="userId" value={inviteUser.id} />
			<div>
				<label class="label" for="inv-message"
					>Message <span class="font-normal text-muted">(optional)</span></label
				>
				<textarea
					id="inv-message"
					name="message"
					rows="3"
					maxlength="300"
					class="w-full"
					placeholder="We'd love an artist on {myTeam.name}!"></textarea>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn-ghost" onclick={() => (inviteUser = null)}>Cancel</button>
				<button class="btn-primary" disabled={pending}>Send invite</button>
			</div>
		</form>
	{/if}
</Modal>
