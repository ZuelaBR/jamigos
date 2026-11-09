<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import Avatar from '#lib/components/Avatar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { APP_NAME } from '#lib/config.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let menuOpen = $state(false);

	// Lets E2E tests wait until the app is interactive.
	onMount(() => document.documentElement.setAttribute('data-hydrated', ''));

	const loginHref = $derived(
		`/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);
	const isActive = (prefix: string) => page.url.pathname.startsWith(prefix);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{APP_NAME} · Find a team for your next game jam</title>
	<meta
		name="description"
		content="Find teammates for itch.io game jams: artists, coders, musicians and designers looking for a team."
	/>
</svelte:head>

<svelte:window onclick={() => (menuOpen = false)} />

{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent" aria-hidden="true"></div>
{/if}

<div class="flex min-h-dvh flex-col">
	<!-- itch.io-style header: solid bar, 50px, faint shadow -->
	<header class="sticky top-0 z-40 bg-surface" style="box-shadow: var(--header-shadow)">
		<nav class="mx-auto flex h-[50px] max-w-6xl items-center gap-5 px-4">
			<a href="/" class="flex items-center gap-2 text-[17px] font-black tracking-tight text-text">
				<span
					class="flex h-7 w-7 items-center justify-center rounded-md bg-button text-[13px] text-white"
					aria-hidden="true">JM</span
				>
				<span>{APP_NAME}</span>
			</a>
			<a
				href="/jams"
				class="text-[15px] hover:text-text {isActive('/jams')
					? 'font-bold text-text'
					: 'text-muted'}"
			>
				Browse jams
			</a>

			<div class="ml-auto flex items-center gap-3">
				<ThemeToggle initial={data.theme} />
				{#if data.user}
					<a
						href="/inbox"
						class="relative text-[15px] hover:text-text {isActive('/inbox')
							? 'font-bold text-text'
							: 'text-muted'}"
						aria-label={data.inboxCount ? `Inbox, ${data.inboxCount} pending` : 'Inbox'}
					>
						Inbox
						{#if data.inboxCount}
							<span
								class="absolute -top-2 -right-4 min-w-5 rounded-full bg-button px-1.5 text-center text-[11px] leading-5 font-bold text-white"
							>
								{data.inboxCount}
							</span>
						{/if}
					</a>
					<div class="relative ml-2">
						<button
							type="button"
							class="flex items-center gap-1.5 rounded-md p-0.5 hover:bg-surface-2"
							aria-haspopup="menu"
							aria-expanded={menuOpen}
							aria-label="Account menu"
							onclick={(e) => {
								e.stopPropagation();
								menuOpen = !menuOpen;
							}}
						>
							<Avatar user={data.user} size={30} />
							<span class="hidden max-w-28 truncate text-sm font-bold sm:block"
								>{data.user.displayName || data.user.username}</span
							>
							<svg
								viewBox="0 0 24 24"
								width="14"
								height="14"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								class="text-muted"
								aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg
							>
						</button>
						{#if menuOpen}
							<div
								role="menu"
								tabindex="-1"
								class="absolute right-0 mt-1 w-48 overflow-hidden card py-1 text-sm shadow-lg"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
							>
								<a
									role="menuitem"
									class="block px-4 py-2 hover:bg-surface-2"
									href="/u/{data.user.username}"
									onclick={() => (menuOpen = false)}>My profile</a
								>
								<a
									role="menuitem"
									class="block px-4 py-2 hover:bg-surface-2"
									href="/settings"
									onclick={() => (menuOpen = false)}>Edit profile</a
								>
								<form method="POST" action="/logout" class="border-t border-border">
									<button
										role="menuitem"
										class="w-full px-4 py-2 text-left text-muted hover:bg-surface-2 hover:text-text"
									>
										Sign out
									</button>
								</form>
							</div>
						{/if}
					</div>
				{:else}
					<a href={loginHref} class="btn-primary btn-sm">Sign in with itch.io</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
		{@render children()}
	</main>

	<footer class="bg-surface-2 py-6 text-center text-xs text-muted">
		{APP_NAME} is a fan-made tool and is not affiliated with itch.io.
	</footer>
</div>

<Toasts />
