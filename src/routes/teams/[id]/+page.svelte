<script lang="ts">
	import Hourglass from '@lucide/svelte/icons/hourglass';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Mail from '@lucide/svelte/icons/mail';
	import PartyPopper from '@lucide/svelte/icons/party-popper';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import OverlapBadge from '#lib/components/OverlapBadge.svelte';
	import RoleChip from '#lib/components/RoleChip.svelte';
	import RolePicker from '#lib/components/RolePicker.svelte';
	import { withToasts } from '#lib/forms.ts';
	import { EXPERIENCE_LABELS, type Role } from '#lib/profile.ts';
	import { relativeTime } from '#lib/time.ts';
	import { copyToClipboard as copy } from '#lib/clipboard.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const team = $derived(data.team);
	const me = $derived(data.user);
	const requests = $derived(data.pending.filter((p) => p.kind === 'request'));
	const invites = $derived(data.pending.filter((p) => p.kind === 'invite'));
	const myPending = $derived(data.pending.find((p) => p.user.id === me?.id));
	const justCreated = $derived(page.url.searchParams.get('created') === '1');
	const justJoined = $derived(page.url.searchParams.get('joined') === '1');
	const justTeamedUp = $derived(page.url.searchParams.get('teamup') === '1');
	const owner = $derived(data.members.find((m) => m.id === team.ownerId));
	const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);
	const errors = $derived(form && 'errors' in form ? (form.errors as Record<string, string>) : {});

	// Keep JavaScript actions disabled until their handlers and dialogs are ready.
	let interactive = $state(false);
	onMount(() => (interactive = true));
	let editOpen = $state(false);
	let joinOpen = $state(false);
	let pending = $state(false);
	const setPending = (v: boolean) => (pending = v);
	let editRoles = $state<Role[]>([]);
	function openEditor() {
		editRoles = [...team.openRoles];
		editOpen = true;
	}

	// Destructive actions all go through one confirmation dialog (never the browser's confirm()).
	type Person = { id: string; displayName: string | null; username: string };
	type Confirmable =
		| { kind: 'leave' }
		| { kind: 'disband' }
		| { kind: 'remove'; user: Person }
		| { kind: 'transfer'; user: Person };
	let confirming = $state<Confirmable | null>(null);
	let typedName = $state('');
	const closeConfirm = () => {
		confirming = null;
		typedName = '';
	};
	const nameOf = (u: Person) => u.displayName || u.username;
	// Disbanding, or the owner leaving as the last member, deletes the team: type its name.
	const deletesTeam = $derived(
		confirming?.kind === 'disband' || (confirming?.kind === 'leave' && data.isOwner)
	);
	const canConfirm = $derived(!deletesTeam || typedName.trim() === team.name.trim());
</script>

<svelte:head><title>{team.name} · {data.jam.title} · Jamigos</title></svelte:head>

<a href="/jams/{data.jam.slug}?tab=teams" class="text-sm text-muted hover:text-text"
	>← {data.jam.title}</a
>

{#if justTeamedUp && data.isMember}
	<div
		class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm"
	>
		<p>
			<PartyPopper
				size={16}
				class="mr-1.5 inline-block align-[-3px] text-ok"
				aria-hidden="true"
			/><strong>You're a team!</strong>
			{#if data.isOwner}
				We named it <strong>{team.name}</strong>. Give it a proper name and list the roles you still
				need.
			{:else}
				It's called <strong>{team.name}</strong> for now. {owner?.displayName || owner?.username} owns
				the team and can rename it.
			{/if}
		</p>
		{#if data.isOwner}
			<button class="btn-primary btn-sm" disabled={!interactive} onclick={openEditor}
				>Rename team</button
			>
		{/if}
	</div>
{:else if justCreated && data.isOwner}
	<div class="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm">
		<PartyPopper
			size={16}
			class="mr-1.5 inline-block align-[-3px] text-ok"
			aria-hidden="true"
		/><strong>Team created!</strong> Next step: go to the
		<a class="text-accent underline" href="/jams/{data.jam.slug}?tab=players">People list</a> and invite
		people, or share this page.
	</div>
{:else if justJoined && data.isMember}
	<div class="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm">
		<PartyPopper
			size={16}
			class="mr-1.5 inline-block align-[-3px] text-ok"
			aria-hidden="true"
		/><strong>You're in!</strong> Say hi to your teammates. Their contact details are below.
	</div>
{/if}

<div class="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
	<section class="min-w-0 space-y-6">
		<div class="card card-panel">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 class="text-2xl font-bold">{team.name}</h1>
					<p class="text-sm text-muted">
						{data.members.length}
						{data.members.length === 1 ? 'member' : 'members'} ·
						{#if team.status === 'full'}<span class="text-warn">Not recruiting</span>{:else}<span
								class="text-ok">Recruiting</span
							>{/if}
					</p>
				</div>
				<div class="flex gap-2">
					<button
						class="btn-ghost btn-sm"
						disabled={!interactive}
						onclick={() => copy(page.url.origin + page.url.pathname)}>Share link</button
					>
					{#if data.isOwner}<button
							class="btn-ghost btn-sm"
							disabled={!interactive}
							onclick={openEditor}>Edit team</button
						>{/if}
				</div>
			</div>

			{#if team.openRoles.length && team.status === 'open'}
				<div class="mt-4 flex flex-wrap gap-1.5">
					{#each team.openRoles as role (role)}<RoleChip {role} variant="wanted" />{/each}
				</div>
			{/if}
			{#if team.description}<p class="mt-4 whitespace-pre-line text-text/90">
					{team.description}
				</p>{/if}
		</div>

		<div class="card divide-y divide-border">
			<h2 class="px-5 py-3 font-semibold">Members</h2>
			{#each data.members as m (m.id)}
				<div class="flex flex-wrap items-center gap-3 px-5 py-3">
					<a href="/u/{m.username}" aria-label="View {m.displayName || m.username}'s profile"
						><Avatar user={m} size={40} /></a
					>
					<div class="min-w-0 flex-1">
						<a href="/u/{m.username}" class="font-medium hover:text-accent"
							>{m.displayName || m.username}</a
						>
						{#if m.id === team.ownerId}<span
								class="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent uppercase"
								>Owner</span
							>{/if}
						<div class="mt-1 flex flex-wrap items-center gap-1.5">
							{#each m.roles as role (role)}<RoleChip {role} />{/each}
						</div>
						<div class="mt-1">
							<OverlapBadge
								timezone={m.timezone}
								viewerTimezone={m.id === me?.id ? null : me?.timezone}
							/>
						</div>
					</div>
					<!-- On small screens the actions get their own row (aligned with the name) instead
					     of squeezing the member info until it overlaps. -->
					<div class="flex w-full flex-wrap items-center gap-2 pl-[52px] text-sm sm:w-auto sm:pl-0">
						{#if m.contactDiscord}
							<button
								class="btn-ghost btn-sm min-w-0"
								title="Copy Discord username: {m.contactDiscord}"
								disabled={!interactive}
								onclick={() => copy(m.contactDiscord!)}
								><span class="min-w-0 truncate">Discord: {m.contactDiscord}</span></button
							>
						{/if}
						<a class="btn-ghost btn-sm" href={m.itchUrl} target="_blank" rel="noopener">itch.io ↗</a
						>
						{#if data.isOwner && m.id !== me?.id}
							<button
								type="button"
								class="btn-ghost btn-sm"
								disabled={!interactive}
								onclick={() => (confirming = { kind: 'transfer', user: m })}>Make owner</button
							>
							<button
								type="button"
								class="btn-danger-outline btn-sm"
								disabled={!interactive}
								onclick={() => (confirming = { kind: 'remove', user: m })}>Remove</button
							>
						{/if}
					</div>
				</div>
			{/each}
			{#if !me}
				<p class="px-5 py-3 text-sm text-muted">
					<a class="text-accent hover:underline" href={loginHref}>Sign in</a> to see how to contact members.
				</p>
			{/if}
		</div>

		{#if data.isMember}
			{@const lastMember = data.members.length === 1}
			<div class="rounded-md border border-danger/40" aria-labelledby="danger-title">
				<h2
					id="danger-title"
					class="flex items-center gap-2 border-b border-danger/30 px-5 py-3 font-bold text-danger"
				>
					<TriangleAlert size={16} aria-hidden="true" />Danger zone
				</h2>
				<div class="divide-y divide-border">
					{#if !(data.isOwner && lastMember)}
						<div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
							<div class="max-w-md">
								<p class="font-bold">Leave team</p>
								<p class="text-sm text-muted">
									{#if data.isOwner}
										You own this team. Make another member the owner before you leave.
									{:else}
										You'll be removed from {team.name}. To come back you'd need to ask to join
										again.
									{/if}
								</p>
							</div>
							<button
								type="button"
								class="btn-danger-outline btn-sm"
								disabled={!interactive || data.isOwner}
								onclick={() => (confirming = { kind: 'leave' })}>Leave team…</button
							>
						</div>
					{/if}
					{#if data.isOwner}
						<div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
							<div class="max-w-md">
								<p class="font-bold">Disband team</p>
								<p class="text-sm text-muted">
									Permanently deletes {team.name}{lastMember
										? ''
										: ` for all ${data.members.length} members`}. This can't be undone.
								</p>
							</div>
							<button
								type="button"
								class="btn-danger-outline btn-sm"
								disabled={!interactive}
								onclick={() => (confirming = { kind: 'disband' })}>Disband team…</button
							>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</section>

	<aside class="space-y-4">
		<!-- Viewer actions -->
		<div class="card card-panel">
			{#if !me}
				<p class="text-sm">Want to join this team?</p>
				<a href={loginHref} class="mt-3 btn-primary w-full">Sign in with itch.io</a>
			{:else if data.isMember}
				<p class="text-sm">
					{data.isOwner ? 'You own this team.' : "You're a member of this team."}
				</p>
				<p class="mt-1 text-xs text-muted">
					{data.isOwner
						? 'You can rename it, manage requests and invite people.'
						: 'Your teammates can reach you with the contact details below.'}
				</p>
			{:else if myPending?.kind === 'invite'}
				<p class="text-sm">
					<Mail
						size={16}
						class="mr-1.5 inline-block align-[-3px] text-accent"
						aria-hidden="true"
					/>You've been invited to join!
				</p>
				{#if myPending.message}<p class="mt-2 rounded-lg bg-surface-2 p-3 text-sm italic">
						"{myPending.message}"
					</p>{/if}
				<form method="POST" action="?/respond" class="mt-3 flex gap-2" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={myPending.id} />
					<button class="btn-primary flex-1" name="accept" value="1">Accept</button>
					<button class="btn-ghost flex-1" name="accept" value="0">Decline</button>
				</form>
			{:else if myPending?.kind === 'request'}
				<p class="text-sm">
					<Hourglass
						size={16}
						class="mr-1.5 inline-block align-[-3px] text-muted"
						aria-hidden="true"
					/>Your request is waiting for the owner.
				</p>
				<form method="POST" action="?/cancel" class="mt-3" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={myPending.id} />
					<button class="btn-ghost w-full">Withdraw request</button>
				</form>
			{:else if team.status === 'open'}
				<button class="btn-primary w-full" disabled={!interactive} onclick={() => (joinOpen = true)}
					>Ask to join</button
				>
			{:else}
				<p class="text-sm text-muted">This team isn't recruiting right now.</p>
			{/if}
		</div>

		{#if data.isOwner}
			<div class="card card-panel">
				<h2 class="mb-3 font-semibold">
					Join requests {#if requests.length}<span class="text-accent">({requests.length})</span
						>{/if}
				</h2>
				{#each requests as r (r.id)}
					<div class="mb-4 last:mb-0">
						<div class="flex items-center gap-2">
							<Avatar user={r.user} size={32} />
							<div class="min-w-0">
								<a
									href="/u/{r.user.username}"
									class="block truncate text-sm font-medium hover:text-accent"
									>{r.user.displayName || r.user.username}</a
								>
								<p class="text-xs text-muted">
									{EXPERIENCE_LABELS[r.user.experience]} · {relativeTime(r.createdAt)}
								</p>
							</div>
						</div>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each r.user.roles as role (role)}<RoleChip {role} />{/each}
						</div>
						{#if r.message}<p class="mt-2 rounded-lg bg-surface-2 p-2 text-sm">
								"{r.message}"
							</p>{/if}
						<form
							method="POST"
							action="?/respond"
							class="mt-2 flex gap-2"
							use:enhance={withToasts()}
						>
							<input type="hidden" name="requestId" value={r.id} />
							<button class="btn-primary btn-sm flex-1" name="accept" value="1">Accept</button>
							<button class="btn-ghost btn-sm flex-1" name="accept" value="0">Decline</button>
						</form>
					</div>
				{:else}
					<p class="text-sm text-muted">No pending requests.</p>
				{/each}
			</div>

			{#if invites.length}
				<div class="card card-panel">
					<h2 class="mb-3 font-semibold">Invites sent</h2>
					<ul class="space-y-2">
						{#each invites as inv (inv.id)}
							<li class="flex items-center gap-2 text-sm">
								<Avatar user={inv.user} size={24} />
								<a href="/u/{inv.user.username}" class="flex-1 truncate hover:text-accent"
									>{inv.user.displayName || inv.user.username}</a
								>
								<form method="POST" action="?/cancel" use:enhance={withToasts()}>
									<input type="hidden" name="requestId" value={inv.id} />
									<button class="text-xs text-muted hover:text-accent">Cancel</button>
								</form>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</aside>
</div>

<Modal bind:open={joinOpen} title="Ask to join {team.name}">
	<form
		method="POST"
		action="?/requestJoin"
		class="space-y-4"
		use:enhance={withToasts({ pending: setPending, onSuccess: () => (joinOpen = false) })}
	>
		<div>
			<label class="label" for="req-message"
				>Say hi <span class="font-normal text-muted">(optional)</span></label
			>
			<textarea id="req-message" name="message" rows="3" maxlength="300" class="w-full"></textarea>
		</div>
		<div class="flex justify-end gap-2">
			<button type="button" class="btn-ghost" onclick={() => (joinOpen = false)}>Cancel</button>
			<button class="btn-primary" disabled={pending}>Send request</button>
		</div>
	</form>
</Modal>

{#if data.isOwner}
	<Modal bind:open={editOpen} title="Edit team">
		{#if editOpen}
			<form
				method="POST"
				action="?/update"
				class="space-y-4"
				use:enhance={withToasts({
					pending: setPending,
					onSuccess: () => (editOpen = false),
					reset: false
				})}
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
						value={team.name}
					/>
					{#if errors.name}<p class="field-error">{errors.name}</p>{/if}
				</div>
				<div>
					<span class="label">Looking for</span>
					<RolePicker name="openRoles" bind:selected={editRoles} />
				</div>
				<div>
					<label class="label" for="team-desc">Pitch</label>
					<textarea id="team-desc" name="description" rows="3" maxlength="500" class="w-full"
						>{team.description}</textarea
					>
				</div>
				<fieldset>
					<legend class="label">Status</legend>
					<div class="flex flex-wrap gap-2 text-sm">
						<label class="choice"
							><input
								type="radio"
								class="sr-only"
								name="status"
								value="open"
								checked={team.status === 'open'}
							/> Recruiting</label
						>
						<label class="choice"
							><input
								type="radio"
								class="sr-only"
								name="status"
								value="full"
								checked={team.status === 'full'}
							/> Not recruiting</label
						>
					</div>
				</fieldset>
				<div class="flex justify-end gap-2">
					<button type="button" class="btn-ghost" onclick={() => (editOpen = false)}>Cancel</button>
					<button class="btn-primary" disabled={pending}>Save</button>
				</div>
			</form>
		{/if}
	</Modal>
{/if}

<!-- Confirmation for destructive actions -->
<Modal
	open={!!confirming}
	onclose={closeConfirm}
	title={confirming?.kind === 'leave'
		? `Leave ${team.name}?`
		: confirming?.kind === 'disband'
			? `Disband ${team.name}?`
			: confirming?.kind === 'remove'
				? `Remove ${nameOf(confirming.user)}?`
				: confirming?.kind === 'transfer'
					? `Make ${nameOf(confirming.user)} the owner?`
					: ''}
>
	{#if confirming}
		<form
			method="POST"
			action="?/{confirming.kind}"
			class="space-y-4"
			use:enhance={withToasts({ pending: setPending, onSuccess: closeConfirm })}
		>
			{#if confirming.kind === 'remove' || confirming.kind === 'transfer'}
				<input type="hidden" name="userId" value={confirming.user.id} />
			{/if}

			<ul class="list-disc space-y-1.5 pl-5 text-sm text-muted">
				{#if confirming.kind === 'leave'}
					<li>You'll be removed from <strong class="text-text">{team.name}</strong>.</li>
					<li>To come back, you'd need to ask to join again or be invited.</li>
					<li>
						Your "looking for a team" post isn't restored. You can post again on the jam board.
					</li>
				{:else if confirming.kind === 'disband'}
					<li>
						<strong class="text-text">{team.name}</strong> is deleted for
						{data.members.length === 1 ? 'you' : `all ${data.members.length} members`}.
					</li>
					<li>Pending invites and join requests are cancelled.</li>
					<li><strong class="text-danger">This can't be undone.</strong></li>
				{:else if confirming.kind === 'remove'}
					<li>
						{nameOf(confirming.user)} will no longer be on
						<strong class="text-text">{team.name}</strong>.
					</li>
					<li>They can ask to join again later.</li>
				{:else}
					<li>
						{nameOf(confirming.user)} becomes the owner of
						<strong class="text-text">{team.name}</strong>.
					</li>
					<li>You'll no longer be able to rename the team, accept requests or remove members.</li>
					<li>Only the new owner can make you owner again.</li>
				{/if}
			</ul>

			{#if deletesTeam}
				<div>
					<label class="label" for="confirm-name"
						>Type <span class="font-black">{team.name}</span> to confirm</label
					>
					<input
						id="confirm-name"
						name="confirm"
						class="w-full"
						autocomplete="off"
						spellcheck="false"
						bind:value={typedName}
					/>
				</div>
			{/if}

			<div class="flex justify-end gap-2">
				<!-- svelte-ignore a11y_autofocus -->
				<button type="button" class="btn-ghost" autofocus onclick={closeConfirm}>Cancel</button>
				<button
					class={confirming.kind === 'transfer' ? 'btn-primary' : 'btn-danger'}
					disabled={pending || !canConfirm}
				>
					{confirming.kind === 'leave'
						? 'Leave team'
						: confirming.kind === 'disband'
							? 'Disband team'
							: confirming.kind === 'remove'
								? 'Remove from team'
								: 'Make owner'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
