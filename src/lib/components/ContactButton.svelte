<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { copyToClipboard } from '#lib/clipboard.ts';
	import Modal from './Modal.svelte';

	let {
		user,
		signedIn,
		loginHref
	}: {
		user: {
			displayName: string | null;
			username: string;
			contactDiscord: string | null;
			itchUrl: string;
		};
		signedIn: boolean;
		loginHref: string;
	} = $props();

	let open = $state(false);
	const name = $derived(user.displayName || user.username);
</script>

{#if !signedIn}
	<!-- Contact details are only shown to signed-in itch.io users. -->
	<a href={loginHref} class="btn-ghost btn-sm" title="Sign in to see how to contact {name}">
		<MessageCircle size={14} aria-hidden="true" />Contact
	</a>
{:else}
	<div>
		<button
			type="button"
			class="btn-ghost btn-sm"
			aria-expanded={open}
			aria-haspopup="dialog"
			onclick={() => (open = true)}
		>
			<MessageCircle size={14} aria-hidden="true" />Contact
		</button>
		<Modal bind:open title="How to contact {name}">
			{#if user.contactDiscord}
				<p class="text-xs text-muted">Discord</p>
				<div class="mt-0.5 flex items-center justify-between gap-2">
					<span class="truncate font-bold">{user.contactDiscord}</span>
					<button
						type="button"
						class="btn-ghost btn-sm"
						onclick={() => copyToClipboard(user.contactDiscord!, 'Discord username copied.')}
					>
						<Copy size={13} aria-hidden="true" />Copy
					</button>
				</div>
			{:else}
				<p class="text-xs text-muted">{name} hasn't added a Discord username.</p>
			{/if}
			<a
				href={user.itchUrl}
				target="_blank"
				rel="noopener"
				class="mt-3 flex items-center gap-1.5 font-bold link"
			>
				itch.io profile <ExternalLink size={13} aria-hidden="true" />
			</a>
		</Modal>
	</div>
{/if}
