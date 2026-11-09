<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import OverlapBadge from '#lib/components/OverlapBadge.svelte';
	import RoleChip from '#lib/components/RoleChip.svelte';
	import RolePicker from '#lib/components/RolePicker.svelte';
	import { withToasts } from '#lib/forms.ts';
	import { EXPERIENCE_LABELS, type Role } from '#lib/profile.ts';
	import { relativeTime } from '#lib/time.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const team = $derived(data.team);
	const me = $derived(data.user);
	const requests = $derived(data.pending.filter((p) => p.kind === 'request'));
	const invites = $derived(data.pending.filter((p) => p.kind === 'invite'));
	const myPending = $derived(data.pending.find((p) => p.user.id === me?.id));
	const justCreated = $derived(page.url.searchParams.get('created') === '1');
	const justJoined = $derived(page.url.searchParams.get('joined') === '1');
	const loginHref = $derived(`/login?next=${encodeURIComponent(page.url.pathname)}`);
	const errors = $derived(form && 'errors' in form ? (form.errors as Record<string, string>) : {});

	let editOpen = $state(false);
	let joinOpen = $state(false);
	let pending = $state(false);
	const setPending = (v: boolean) => (pending = v);
	// svelte-ignore state_referenced_locally
	let editRoles = $state<Role[]>([...data.team.openRoles]);

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toast('Copied to clipboard.');
	}

	function confirmSubmit(message: string) {
		return (e: SubmitEvent) => {
			if (!confirm(message)) e.preventDefault();
		};
	}
</script>

<svelte:head><title>{team.name} · {data.jam.title}</title></svelte:head>

<a href="/jams/{data.jam.slug}?tab=teams" class="text-sm text-muted hover:text-text"
	>← {data.jam.title}</a
>

{#if justCreated && data.isOwner}
	<div class="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm">
		<strong>Team created! 🎉</strong> Next step: go to the
		<a class="text-accent underline" href="/jams/{data.jam.slug}">"Looking for a team" list</a> and invite
		people, or share this page.
	</div>
{:else if justJoined && data.isMember}
	<div class="mt-4 rounded-xl border border-ok/40 bg-ok/10 p-4 text-sm">
		<strong>You're in! 🎉</strong> Say hi to your teammates. Their contact details are below.
	</div>
{/if}

<div class="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
	<section class="space-y-6">
		<div class="card p-5 sm:p-6">
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
					<button class="btn-ghost btn-sm" onclick={() => copy(page.url.origin + page.url.pathname)}
						>Share link</button
					>
					{#if data.isOwner}<button class="btn-ghost btn-sm" onclick={() => (editOpen = true)}
							>Edit team</button
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

		<div class="divide-y divide-border card">
			<h2 class="px-5 py-3 font-semibold">Members</h2>
			{#each data.members as m (m.id)}
				<div class="flex flex-wrap items-center gap-3 px-5 py-3">
					<a href="/u/{m.username}"><Avatar user={m} size={40} /></a>
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
					<div class="flex flex-wrap items-center gap-2 text-sm">
						{#if m.contactDiscord}
							<button
								class="btn-ghost btn-sm"
								title="Copy Discord username"
								onclick={() => copy(m.contactDiscord!)}>Discord: {m.contactDiscord}</button
							>
						{/if}
						{#if m.contactEmail}<a class="btn-ghost btn-sm" href="mailto:{m.contactEmail}">Email</a
							>{/if}
						<a class="btn-ghost btn-sm" href={m.itchUrl} target="_blank" rel="noopener">itch.io ↗</a
						>
						{#if data.isOwner && m.id !== me?.id}
							<form
								method="POST"
								action="?/transfer"
								use:enhance={withToasts()}
								onsubmit={confirmSubmit(`Make ${m.displayName || m.username} the owner?`)}
							>
								<input type="hidden" name="userId" value={m.id} />
								<button class="btn-ghost btn-sm">Make owner</button>
							</form>
							<form
								method="POST"
								action="?/remove"
								use:enhance={withToasts()}
								onsubmit={confirmSubmit(`Remove ${m.displayName || m.username} from the team?`)}
							>
								<input type="hidden" name="userId" value={m.id} />
								<button class="btn-ghost btn-sm text-accent">Remove</button>
							</form>
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
	</section>

	<aside class="space-y-4">
		<!-- Viewer actions -->
		<div class="card p-5">
			{#if !me}
				<p class="text-sm">Want to join this team?</p>
				<a href={loginHref} class="mt-3 btn-primary w-full">Sign in with itch.io</a>
			{:else if data.isMember}
				{#if data.isOwner && data.members.length > 1}
					<p class="text-sm text-muted">
						You own this team. Make someone else owner before leaving.
					</p>
				{:else}
					<form
						method="POST"
						action="?/leave"
						use:enhance={withToasts()}
						onsubmit={confirmSubmit(
							data.isOwner
								? 'You are the last member. This will delete the team. Continue?'
								: 'Leave this team?'
						)}
					>
						<button class="btn-ghost w-full"
							>{data.isOwner ? 'Leave & delete team' : 'Leave team'}</button
						>
					</form>
				{/if}
				{#if data.isOwner}
					<form
						method="POST"
						action="?/disband"
						class="mt-2"
						use:enhance={withToasts()}
						onsubmit={confirmSubmit('Disband the team for everyone? This cannot be undone.')}
					>
						<button class="w-full text-center text-xs text-muted hover:text-accent"
							>Disband team</button
						>
					</form>
				{/if}
			{:else if myPending?.kind === 'invite'}
				<p class="text-sm">📨 You've been invited to join!</p>
				{#if myPending.message}<p class="mt-2 rounded-lg bg-surface-2 p-3 text-sm italic">
						"{myPending.message}"
					</p>{/if}
				<form method="POST" action="?/respond" class="mt-3 flex gap-2" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={myPending.id} />
					<button class="btn-primary flex-1" name="accept" value="1">Accept</button>
					<button class="btn-ghost flex-1" name="accept" value="0">Decline</button>
				</form>
			{:else if myPending?.kind === 'request'}
				<p class="text-sm">⏳ Your request is waiting for the owner.</p>
				<form method="POST" action="?/cancel" class="mt-3" use:enhance={withToasts()}>
					<input type="hidden" name="requestId" value={myPending.id} />
					<button class="btn-ghost w-full">Withdraw request</button>
				</form>
			{:else if team.status === 'open'}
				<button class="btn-primary w-full" onclick={() => (joinOpen = true)}>Ask to join</button>
			{:else}
				<p class="text-sm text-muted">This team isn't recruiting right now.</p>
			{/if}
		</div>

		{#if data.isOwner}
			<div class="card p-5">
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
							<button class="btn-primary flex-1 btn-sm" name="accept" value="1">Accept</button>
							<button class="btn-ghost flex-1 btn-sm" name="accept" value="0">Decline</button>
						</form>
					</div>
				{:else}
					<p class="text-sm text-muted">No pending requests.</p>
				{/each}
			</div>

			{#if invites.length}
				<div class="card p-5">
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
		<form
			method="POST"
			action="?/update"
			class="space-y-4"
			use:enhance={withToasts({ pending: setPending, onSuccess: () => (editOpen = false) })}
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
				<div class="flex gap-4 text-sm">
					<label class="flex items-center gap-2"
						><input type="radio" name="status" value="open" checked={team.status === 'open'} /> Recruiting</label
					>
					<label class="flex items-center gap-2"
						><input type="radio" name="status" value="full" checked={team.status === 'full'} /> Team is
						full</label
					>
				</div>
			</fieldset>
			<div class="flex justify-end gap-2">
				<button type="button" class="btn-ghost" onclick={() => (editOpen = false)}>Cancel</button>
				<button class="btn-primary" disabled={pending}>Save</button>
			</div>
		</form>
	</Modal>
{/if}
