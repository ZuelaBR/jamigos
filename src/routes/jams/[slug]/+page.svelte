<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { page } from '$app/state';
	import Check from '@lucide/svelte/icons/check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Hand from '@lucide/svelte/icons/hand';
	import Handshake from '@lucide/svelte/icons/handshake';
	import Mail from '@lucide/svelte/icons/mail';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import UserRoundSearch from '@lucide/svelte/icons/user-round-search';
	import Users from '@lucide/svelte/icons/users';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import ContactButton from '#lib/components/ContactButton.svelte';
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
	// Show both kinds of opportunity by default. Keep existing People/Teams links working.
	const tab = $derived.by(() => {
		const t = params.get('tab');
		return t === 'teams' || t === 'players' ? t : t === 'people' ? 'players' : 'all';
	});
	const roleFilter = $derived(
		ROLES.includes(params.get('role') as Role) ? (params.get('role') as Role) : null
	);
	const expFilter = $derived(params.get('exp'));
	const overlapOnly = $derived(params.get('overlap') === '1');
	let overlapHelpOpen = $state(false);
	let overlapHelp: HTMLDivElement | undefined = $state();
	const uid = $props.id();
	const overlapHelpId = `${uid}-overlap-help`;
	const overlapDefinition =
		'Shows people with roughly 5 or more waking hours in common with you each day. We estimate this using 9am to midnight in both timezones. Actual availability may differ.';
	const fitOnly = $derived(params.get('fit') === '1');
	// Compose rapid changes against the latest requested query while navigation loads.
	let pendingQuery: string | null = null;
	let filterNavigation = 0;
	function navigateFilters(next: URLSearchParams) {
		const query = next.toString();
		pendingQuery = query;
		const navigation = ++filterNavigation;
		void goto(`${page.url.pathname}${query ? `?${query}` : ''}`, {
			replace: true,
			reset: false
		}).finally(() => {
			if (navigation === filterNavigation) pendingQuery = null;
		});
	}

	function setParam(key: string, value: string | null) {
		// Throwaway copy used to build a URL, not reactive state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new URLSearchParams(pendingQuery ?? page.url.search);
		if (value) next.set(key, value);
		else next.delete(key);
		navigateFilters(next);
	}
	function setView(view: 'all' | 'players' | 'teams') {
		// Keep the shared role filter; drop filters that do not apply to the new view.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new URLSearchParams(pendingQuery ?? page.url.search);
		if (view === 'all') next.delete('tab');
		else next.set('tab', view);
		if (view !== 'players') {
			next.delete('exp');
			next.delete('overlap');
		}
		if (view !== 'teams') next.delete('fit');
		overlapHelpOpen = false;
		navigateFilters(next);
	}

	const myOffset = $derived(data.me ? offsetMinutes(data.me.timezone) : null);
	const overlapsWell = (tz: string) =>
		myOffset === null || overlapHours(offsetMinutes(tz), myOffset) >= 5;
	const otherPosts = $derived(board.posts.filter((post) => post.user.id !== data.me?.id));

	const players = $derived(
		otherPosts.filter(
			(p) =>
				(!roleFilter || p.roles.includes(roleFilter)) &&
				(tab !== 'players' || !expFilter || p.user.experience === expFilter) &&
				(tab !== 'players' || !overlapOnly || overlapsWell(p.user.timezone))
		)
	);

	const fitsMe = (roles: Role[]) => !!data.me && roles.some((r) => data.me!.roles.includes(r));
	const recruitingTeams = $derived(
		board.teams.filter((team) => team.status === 'open' && team.id !== viewer?.myTeamId)
	);
	const teamsShown = $derived(
		recruitingTeams
			.filter(
				(t) =>
					(!roleFilter || t.openRoles.includes(roleFilter)) &&
					(tab !== 'teams' || !fitOnly || fitsMe(t.openRoles))
			)
			// Open teams that need what I can do first.
			.toSorted(
				(a, b) =>
					Number(b.status === 'open') - Number(a.status === 'open') ||
					Number(fitsMe(b.openRoles)) - Number(fitsMe(a.openRoles))
			)
	);
	const views = $derived([
		{
			id: 'all' as const,
			label: 'All',
			icon: LayoutGrid,
			count: players.length + teamsShown.length
		},
		{ id: 'players' as const, label: 'People', icon: UserRoundSearch, count: players.length },
		{ id: 'teams' as const, label: 'Teams', icon: Users, count: teamsShown.length }
	]);
	const results = $derived.by(() => {
		const people = players.map((post) => ({
			kind: 'person' as const,
			id: post.id,
			post,
			time: post.updatedAt.getTime()
		}));
		const teams = teamsShown.map((team) => ({
			kind: 'team' as const,
			id: team.id,
			team,
			time: team.createdAt.getTime()
		}));
		if (tab === 'players') return people;
		if (tab === 'teams') return teams;
		return [...people, ...teams].toSorted((a, b) => b.time - a.time);
	});
	const peopleSummary = $derived(
		`${players.length} ${players.length === 1 ? 'person' : 'people'} looking for a team`
	);
	const teamsSummary = $derived(
		`${teamsShown.length} ${teamsShown.length === 1 ? 'team' : 'teams'} recruiting`
	);

	// Confirmation after leaving or disbanding a team (the team page redirects here).
	onMount(() => {
		const done = page.url.searchParams.has('left')
			? 'You left the team.'
			: page.url.searchParams.has('disbanded')
				? 'Team disbanded.'
				: null;
		if (!done) return;
		toast(done);
		const url = new URL(page.url.href);
		url.searchParams.delete('left');
		url.searchParams.delete('disbanded');
		void goto(url, { state: {}, shallow: true, replace: true, reset: false });
	});

	// ---- Modals ----
	let lfgOpen = $state(false);
	let teamOpen = $state(false);
	let requestTeam = $state<(typeof board.teams)[number] | null>(null);
	let inviteUser = $state<(typeof board.posts)[number]['user'] | null>(null);
	let teamUpUser = $state<(typeof board.posts)[number]['user'] | null>(null);
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
	// Solo jammers (signed in, not on a team) can team up with other solo jammers.
	const canTeamUp = $derived(!!data.me && !viewer?.myTeamId);
	const teamUpSentTo = (userId: string) =>
		viewer?.teamUpsSent.find((t) => t.userId === userId)?.teamUpId;
	const teamUpFrom = (userId: string) =>
		viewer?.teamUpsReceived.find((t) => t.from.id === userId)?.teamUpId;
	const displayName = (u: { displayName: string | null; username: string }) =>
		u.displayName || u.username;
</script>

<svelte:window
	onclick={(event) => {
		if (!overlapHelp?.contains(event.target as Node)) overlapHelpOpen = false;
	}}
	onkeydown={(event) => {
		if (event.key === 'Escape') overlapHelpOpen = false;
	}}
/>

<svelte:head><title>{jam.title} · Find teammates · Jamigos</title></svelte:head>

<!-- Jam header -->
<section class="card overflow-hidden">
	<div class="flex items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-6">
		{#if jam.coverUrl}
			<img
				src={jam.coverUrl}
				alt=""
				class="h-14 w-[72px] shrink-0 rounded-md object-cover sm:h-24 sm:w-32"
			/>
		{/if}
		<div class="min-w-0 flex-1">
			<h1 class="text-xl leading-tight font-bold sm:text-3xl">{jam.title}</h1>
			{#if jam.hostName}<p class="text-sm text-muted">Hosted by {jam.hostName}</p>{/if}
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<span class="flex items-center gap-1.5 {timing.live ? 'text-ok' : 'text-muted'}">
					{#if timing.live}<span class="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden="true"
						></span>{/if}
					{timing.label}
				</span>
				{#if jam.startsAt && jam.endsAt}
					<span class="hidden text-muted sm:inline"
						>{formatDate(jam.startsAt)} → {formatDate(jam.endsAt)}</span
					>
				{/if}
				<span class="text-muted">{jam.joinedCount.toLocaleString('en')} joined on itch.io</span>
				<a href={jam.url} target="_blank" rel="noopener" class="link sm:hidden">itch.io page ↗</a>
			</div>
		</div>
		<a
			href={jam.url}
			target="_blank"
			rel="noopener"
			class="btn-ghost hidden btn-sm shrink-0 sm:inline-flex">Jam page on itch.io ↗</a
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
					<PartyPopper
						size={16}
						class="mr-1 inline-block align-[-3px] text-accent"
						aria-hidden="true"
					/>You're on
					<a class="font-semibold text-accent hover:underline" href="/teams/{myTeam.id}"
						>{myTeam.name}</a
					> for this jam.
				</p>
				<a href="/teams/{myTeam.id}" class="btn-ghost btn-sm"
					>{viewer?.isOwner ? 'Manage team' : 'View team'}</a
				>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm">
					{#if viewer?.myPost}
						<CircleCheck
							size={16}
							class="mr-1 inline-block align-[-3px] text-ok"
							aria-hidden="true"
						/>You're listed as <strong>looking for a team</strong>.
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
						<button class="btn-primary btn-sm" onclick={() => (lfgOpen = true)}>
							<Hand size={15} aria-hidden="true" />I'm looking for a team</button
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
				<p class="text-sm">
					<Mail
						size={16}
						class="mr-1 inline-block align-[-3px] text-accent"
						aria-hidden="true"
					/><strong>{teamName(invite.teamId)}</strong> invited you to join!
				</p>
				<form method="POST" action="?/respond" class="flex gap-2" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={invite.requestId} />
					<button class="btn-primary btn-sm" name="accept" value="1">Accept</button>
					<button class="btn-ghost btn-sm" name="accept" value="0">Decline</button>
				</form>
			</div>
		{/each}

		{#each viewer?.teamUpsReceived ?? [] as t (t.teamUpId)}
			<div class="mt-3 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2">
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-sm">
						<Handshake
							size={16}
							class="mr-1 inline-block align-[-3px] text-accent"
							aria-hidden="true"
						/><a class="font-bold hover:underline" href="/u/{t.from.username}"
							>{displayName(t.from)}</a
						> wants to team up with you!
					</p>
					<form
						method="POST"
						action="?/respondTeamUp"
						class="flex gap-2"
						use:enhance={withToasts()}
					>
						<input type="hidden" name="teamUpId" value={t.teamUpId} />
						<button class="btn-primary btn-sm" name="accept" value="1">Team up</button>
						<button class="btn-ghost btn-sm" name="accept" value="0">Decline</button>
					</form>
				</div>
				{#if t.message}<p class="mt-1.5 text-sm text-muted">"{t.message}"</p>{/if}
			</div>
		{/each}
	</div>
</section>

<!-- Tabs + filters -->
<div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
	<div
		class="flex rounded-lg border border-border p-1"
		role="tablist"
		tabindex="-1"
		aria-label="Find teammates"
		onkeydown={(e) => {
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
			const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
			const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
			const next =
				e.key === 'Home'
					? 0
					: e.key === 'End'
						? tabs.length - 1
						: (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
			e.preventDefault();
			tabs[next]?.focus();
			tabs[next]?.click();
		}}
	>
		{#each views as view (view.id)}
			{@const Icon = view.icon}
			<button
				id="board-tab-{view.id}"
				role="tab"
				aria-controls="board-results"
				tabindex={tab === view.id ? 0 : -1}
				aria-selected={tab === view.id}
				onclick={() => setView(view.id)}
				class="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-bold whitespace-nowrap sm:px-3 {tab ===
				view.id
					? 'bg-surface-2 text-text'
					: 'text-muted hover:text-text'}"
			>
				<Icon size={15} class="hidden shrink-0 sm:block" aria-hidden="true" />
				{view.label}<span class="text-xs font-normal text-muted">{view.count}</span>
			</button>
		{/each}
	</div>

	<div class="flex flex-wrap items-center gap-2 lg:ml-auto">
		<select
			aria-label="Filter by role"
			value={roleFilter ?? ''}
			onchange={(e) => setParam('role', e.currentTarget.value || null)}
		>
			<option value="">{tab === 'teams' ? 'Needs any role' : 'Any role'}</option>
			{#each ROLES as r (r)}<option value={r}>{ROLE_LABELS[r]}</option>{/each}
		</select>
		{#if tab === 'players'}
			<select
				aria-label="Filter by experience"
				value={expFilter ?? ''}
				onchange={(e) => setParam('exp', e.currentTarget.value || null)}
			>
				<option value="">Any experience</option>
				{#each EXPERIENCES as x (x)}<option value={x}>{EXPERIENCE_LABELS[x]}</option>{/each}
			</select>
			{#if data.me}
				<div
					bind:this={overlapHelp}
					class="relative flex w-full items-center gap-1 sm:w-auto"
					role="group"
					aria-label="Timezone overlap filter"
					onpointerenter={(event) => {
						if (event.pointerType === 'mouse') overlapHelpOpen = true;
					}}
					onpointerleave={() => {
						if (!overlapHelp?.contains(document.activeElement)) overlapHelpOpen = false;
					}}
					onfocusin={() => (overlapHelpOpen = true)}
					onfocusout={(event) => {
						if (!overlapHelp?.contains(event.relatedTarget as Node)) overlapHelpOpen = false;
					}}
				>
					<label class="flex cursor-pointer items-center gap-2 text-sm text-muted">
						<input
							type="checkbox"
							aria-describedby={overlapHelpId}
							checked={overlapOnly}
							onchange={(e) => setParam('overlap', e.currentTarget.checked ? '1' : null)}
						/>
						Good timezone overlap
					</label>
					<button
						type="button"
						class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
						aria-label="About good timezone overlap"
						aria-describedby={overlapHelpId}
						aria-expanded={overlapHelpOpen}
						onclick={() => (overlapHelpOpen = true)}
					>
						<CircleHelp size={16} aria-hidden="true" />
					</button>
					<div
						id={overlapHelpId}
						role="tooltip"
						hidden={!overlapHelpOpen}
						class="absolute top-full left-0 z-30 w-72 max-w-[calc(100vw-2rem)] pt-2 sm:right-0 sm:left-auto"
					>
						<p
							class="rounded-md border border-border bg-surface p-3 text-left text-xs leading-relaxed text-text shadow-lg"
						>
							{overlapDefinition}
						</p>
					</div>
				</div>
			{/if}
		{:else if tab === 'teams' && data.me}
			<label class="flex cursor-pointer items-center gap-2 text-sm text-muted">
				<input
					type="checkbox"
					checked={fitOnly}
					onchange={(e) => setParam('fit', e.currentTarget.checked ? '1' : null)}
				/>
				Needs my skills
			</label>
		{/if}
	</div>
</div>

<!-- Every view uses the same cards and grid; All mixes both kinds of listing. -->
{#snippet personResult(post: (typeof board.posts)[number])}
	<PlayerCard
		showType
		user={post.user}
		roles={post.roles}
		message={post.message}
		updatedAt={post.updatedAt}
		viewerTimezone={data.me?.timezone}
	>
		{#snippet actions()}
			{#if canInvite && myTeam}
				{@const inviteId = inviteIdFor(post.user.id)}
				{#if inviteId}
					<form method="POST" action="?/cancel" use:enhance={withToasts()}>
						<input type="hidden" name="requestId" value={inviteId} />
						<button class="btn-ghost btn-sm" title="Cancel invite"
							><Check size={14} aria-hidden="true" />Invited · Undo</button
						>
					</form>
				{:else}
					<button class="btn-primary btn-sm" onclick={() => (inviteUser = post.user)}
						>Invite to {myTeam.name}</button
					>
				{/if}
			{:else if canTeamUp}
				{@const sentId = teamUpSentTo(post.user.id)}
				{@const receivedId = teamUpFrom(post.user.id)}
				{#if receivedId}
					<form method="POST" action="?/respondTeamUp" use:enhance={withToasts()}>
						<input type="hidden" name="teamUpId" value={receivedId} />
						<button class="btn-primary btn-sm" name="accept" value="1"
							><Handshake size={14} aria-hidden="true" />Accept team-up</button
						>
					</form>
				{:else if sentId}
					<form method="POST" action="?/cancelTeamUp" use:enhance={withToasts()}>
						<input type="hidden" name="teamUpId" value={sentId} />
						<button class="btn-ghost btn-sm" title="Cancel request"
							><Check size={14} aria-hidden="true" />Team-up sent · Undo</button
						>
					</form>
				{:else}
					<button class="btn-primary btn-sm" onclick={() => (teamUpUser = post.user)}
						><Handshake size={14} aria-hidden="true" />Team up</button
					>
				{/if}
			{/if}
			<ContactButton user={post.user} signedIn={!!data.me} {loginHref} />
		{/snippet}
	</PlayerCard>
{/snippet}

{#snippet teamResult(team: (typeof board.teams)[number])}
	<TeamCard {team} showType highlight={fitsMe(team.openRoles) && team.status === 'open'}>
		{#snippet actions()}
			<a href="/teams/{team.id}" class="btn-ghost btn-sm">View team</a>
			{#if data.me && !viewer?.myTeamId && team.status === 'open'}
				{@const requestId = requestIdFor(team.id)}
				{#if requestId}
					<form method="POST" action="?/cancel" use:enhance={withToasts()}>
						<input type="hidden" name="requestId" value={requestId} />
						<button class="btn-ghost btn-sm" title="Withdraw request"
							><Check size={14} aria-hidden="true" />Requested · Undo</button
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
{/snippet}

<div id="board-results" class="mt-4" role="tabpanel" aria-labelledby="board-tab-{tab}" tabindex="0">
	<p class="mb-3 text-xs text-muted" aria-live="polite">
		{tab === 'all'
			? `${peopleSummary} · ${teamsSummary}`
			: tab === 'players'
				? peopleSummary
				: teamsSummary}
	</p>
	{#if results.length}
		<div class="card-grid">
			{#each results as result (`${result.kind}-${result.id}`)}
				{#if result.kind === 'person'}
					{@render personResult(result.post)}
				{:else}
					{@render teamResult(result.team)}
				{/if}
			{/each}
		</div>
	{:else if tab === 'players'}
		<EmptyState
			icon={UserRoundSearch}
			title={otherPosts.length
				? 'Nobody matches these filters'
				: viewer?.myPost
					? 'You’re the only one looking so far'
					: 'Nobody is looking yet'}
		>
			{#if otherPosts.length}
				Try another role or <a href="/jams/{jam.slug}?tab=players" class="link">clear filters</a>.
			{:else if viewer?.myPost}
				Your post is live. Check back later, or browse teams that are recruiting.
			{:else}
				Be the first! Post that you're available and teams will find you.
			{/if}
		</EmptyState>
	{:else if tab === 'teams'}
		<EmptyState
			icon={Users}
			title={myTeam && board.teams.length === 1
				? 'Yours is the only team so far'
				: recruitingTeams.length
					? 'No teams match these filters'
					: 'No teams are recruiting yet'}
		>
			{#if myTeam && board.teams.length === 1}
				Invite people from the People tab, or share your team’s link.
			{:else if recruitingTeams.length}
				Try another role or <a href="/jams/{jam.slug}?tab=teams" class="link">clear filters</a>.
			{:else}
				Start a team, list the roles you need, and invite people from the People tab.
			{/if}
		</EmptyState>
	{:else}
		<EmptyState
			icon={Users}
			title={roleFilter ? 'No matches for this role' : 'No other jammers yet'}
		>
			{#if roleFilter}
				Try another role or <a href="/jams/{jam.slug}" class="link">clear filters</a>.
			{:else}
				People looking for a team and teams recruiting members will show up here.
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

<!-- Team-up modal (solo + solo) -->
<Modal
	open={!!teamUpUser}
	onclose={() => (teamUpUser = null)}
	title="Team up with {teamUpUser ? displayName(teamUpUser) : ''}"
>
	{#if teamUpUser && data.user}
		<form
			method="POST"
			action="?/teamUp"
			class="space-y-4"
			use:enhance={withToasts({ pending: setPending, onSuccess: () => (teamUpUser = null) })}
		>
			<input type="hidden" name="userId" value={teamUpUser.id} />
			<p class="text-sm text-muted">
				If {displayName(teamUpUser)} says yes, we'll create a team for the two of you called
				<strong class="text-text">{displayName(data.user)} & {displayName(teamUpUser)}</strong>. You
				can rename it and invite more people later.
			</p>
			<div>
				<label class="label" for="teamup-message"
					>Message <span class="font-normal text-muted">(optional)</span></label
				>
				<textarea
					id="teamup-message"
					name="message"
					rows="3"
					maxlength="300"
					class="w-full"
					placeholder="Hi! I'm a programmer and love your art. Want to make something cozy?"
				></textarea>
			</div>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn-ghost" onclick={() => (teamUpUser = null)}>Cancel</button>
				<button class="btn-primary" disabled={pending}>Send request</button>
			</div>
		</form>
	{/if}
</Modal>
