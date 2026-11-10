<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import { menuNavigation } from '#lib/menu.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { dialogs } from '#lib/dialog.svelte.ts';
	import {
		APP_NAME,
		BRAND_COLOR,
		TAGLINE,
		REPOSITORY_URL,
		FEATURE_REQUEST_URL
	} from '#lib/config.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	let menuOpen = $state(false);
	let accountTrigger: HTMLButtonElement | undefined = $state();

	// Lets E2E tests wait until the app is interactive.
	onMount(() => document.documentElement.setAttribute('data-hydrated', ''));

	const loginHref = $derived(
		`/login?next=${encodeURIComponent(page.url.pathname + page.url.search)}`
	);
	const isActive = (prefix: string) => page.url.pathname.startsWith(prefix);
	const description =
		'Find teammates for itch.io game jams: artists, coders, musicians and designers looking for a team.';
</script>

<!-- Favicons and the web manifest are static and live in src/app.html. -->
<svelte:head>
	<title>{APP_NAME} · {TAGLINE}</title>
	<meta name="description" content={description} />
	<meta name="theme-color" content={BRAND_COLOR} />
	<!-- Link previews (Discord, Twitter/X, Slack, …). Crawlers need absolute URLs. -->
	<meta property="og:site_name" content={APP_NAME} />
	<meta property="og:title" content="{APP_NAME} · {TAGLINE}" />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={page.url.origin + page.url.pathname} />
	<meta property="og:image" content="{page.url.origin}/brand/social/jamigos-open-graph-light.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="{APP_NAME}: {TAGLINE}" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<svelte:window onclick={() => (menuOpen = false)} />

<a
	href="#main-content"
	class="fixed top-2 left-2 z-[100] -translate-y-24 rounded-md bg-surface px-4 py-3 font-bold text-accent shadow-lg focus:translate-y-0"
	>Skip to content</a
>

{#if navigating.to}
	<div class="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent" aria-hidden="true"></div>
{/if}

<!-- overflow-x: clip (not hidden) keeps full-bleed bands from adding a horizontal scrollbar
     without breaking the sticky header. -->
<div class="flex min-h-dvh flex-col overflow-x-clip">
	<!-- itch.io-style header: solid bar with a faint shadow. 64px tall so the logo fits at the
	     brand kit's 180px minimum width; small screens show just the team mark (min 48px). -->
	<header class="sticky top-0 z-40 bg-surface" style="box-shadow: var(--header-shadow)">
		<nav
			class="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-5"
			aria-label="Main navigation"
		>
			<a href="/" class="flex shrink-0 items-center" aria-label="{APP_NAME} home">
				<span class="sm:hidden">
					<img
						class="only-light"
						src="/brand/icons/jamigos-team-light.svg"
						alt=""
						width="48"
						height="48"
					/>
					<img
						class="only-dark"
						src="/brand/icons/jamigos-team-dark.svg"
						alt=""
						width="48"
						height="48"
					/>
				</span>
				<span class="hidden sm:block">
					<img
						class="only-light"
						src="/brand/logos/jamigos-horizontal-light.svg"
						alt=""
						width="180"
						height="49"
					/>
					<img
						class="only-dark"
						src="/brand/logos/jamigos-horizontal-dark.svg"
						alt=""
						width="180"
						height="49"
					/>
				</span>
			</a>
			<a
				href="/jams"
				aria-label="Browse jams"
				aria-current={isActive('/jams') ? 'page' : undefined}
				class="inline-flex min-h-11 items-center text-[15px] hover:text-text {isActive('/jams')
					? 'font-bold text-text'
					: 'text-muted'}"
			>
				<span class="sm:hidden">Jams</span><span class="hidden sm:inline">Browse jams</span>
			</a>

			<div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
				<ThemeToggle initial={data.theme} />
				{#if data.user}
					<a
						href="/inbox"
						aria-current={isActive('/inbox') ? 'page' : undefined}
						class="inline-flex min-h-11 items-center gap-1 text-[15px] hover:text-text {isActive(
							'/inbox'
						)
							? 'font-bold text-text'
							: 'text-muted'}"
						aria-label={data.inboxCount ? `Inbox, ${data.inboxCount} pending` : 'Inbox'}
					>
						<InboxIcon size={20} class="sm:hidden" aria-hidden="true" /><span
							class="hidden sm:inline">Inbox</span
						>
						{#if data.inboxCount}
							<span
								class="min-w-5 rounded-full bg-button px-1.5 text-center text-[11px] leading-5 font-bold text-on-button"
							>
								{data.inboxCount}
							</span>
						{/if}
					</a>
					<div class="relative sm:ml-2">
						<button
							bind:this={accountTrigger}
							type="button"
							class="flex min-h-11 items-center gap-1.5 rounded-md p-0.5 hover:bg-surface-2"
							aria-haspopup="menu"
							aria-expanded={menuOpen}
							aria-label="Account menu"
							onkeydown={(e) => {
								if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
									e.preventDefault();
									menuOpen = true;
								}
							}}
							onclick={(e) => {
								e.stopPropagation();
								menuOpen = !menuOpen;
							}}
						>
							<Avatar user={data.user} size={30} />
							<span class="hidden max-w-28 truncate text-sm font-bold sm:block"
								>{data.user.displayName || data.user.username}</span
							>
							<ChevronDown size={14} strokeWidth={2.5} class="text-muted" aria-hidden="true" />
						</button>
						{#if menuOpen}
							<div
								role="menu"
								aria-label="Account"
								use:menuNavigation={{ onclose: () => (menuOpen = false), trigger: accountTrigger }}
								tabindex="-1"
								class="absolute right-0 mt-1 w-48 card overflow-hidden py-1 text-sm shadow-lg"
								onclick={(e) => e.stopPropagation()}
								onkeydown={() => {}}
							>
								<a
									role="menuitem"
									class="block px-4 py-2 hover:bg-surface-2"
									href="/teams"
									aria-current={page.url.pathname === '/teams' ? 'page' : undefined}
									onclick={() => (menuOpen = false)}>My teams</a
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

	<main
		id="main-content"
		tabindex="-1"
		class="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 [overflow-wrap:anywhere] sm:py-8"
	>
		{@render children()}
	</main>

	<footer class="bg-surface-2 px-4 py-6 text-center text-xs text-muted">
		<p>{APP_NAME} is a fan project. Not affiliated with itch.io.</p>
		<nav class="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Project links">
			<a href={REPOSITORY_URL} class="link">GitHub</a>
			<a href={FEATURE_REQUEST_URL} class="link">Request a feature</a>
			<a href="/#data-storage" class="link">Your data</a>
		</nav>
	</footer>
</div>

<Toasts active={dialogs.count === 0} />
