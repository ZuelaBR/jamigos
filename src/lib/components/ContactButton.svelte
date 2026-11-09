<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { toast } from '#lib/toast.svelte.ts';

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

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		toast('Discord username copied.');
	}
</script>

<svelte:window
	onclick={() => (open = false)}
	onkeydown={(e) => e.key === 'Escape' && (open = false)}
/>

{#if !signedIn}
	<!-- Contact details are only shown to signed-in itch.io users. -->
	<a href={loginHref} class="btn-ghost btn-sm" title="Sign in to see how to contact {name}">
		<MessageCircle size={14} aria-hidden="true" />Contact
	</a>
{:else}
	<div class="relative">
		<button
			type="button"
			class="btn-ghost btn-sm"
			aria-expanded={open}
			aria-haspopup="dialog"
			onclick={(e) => {
				e.stopPropagation();
				open = !open;
			}}
		>
			<MessageCircle size={14} aria-hidden="true" />Contact
		</button>
		{#if open}
			<div
				role="dialog"
				aria-label="How to contact {name}"
				tabindex="-1"
				class="absolute bottom-full left-0 z-20 mb-1 w-64 card p-3 text-sm shadow-lg"
				onclick={(e) => e.stopPropagation()}
				onkeydown={() => {}}
			>
				{#if user.contactDiscord}
					<p class="text-xs text-muted">Discord</p>
					<div class="mt-0.5 flex items-center justify-between gap-2">
						<span class="truncate font-bold">{user.contactDiscord}</span>
						<button
							type="button"
							class="btn-ghost btn-sm"
							onclick={() => copy(user.contactDiscord!)}
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
			</div>
		{/if}
	</div>
{/if}
