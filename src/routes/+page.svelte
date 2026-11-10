<script lang="ts">
	import { page } from '$app/state';
	import JamCard from '#lib/components/JamCard.svelte';
	import JamSearch from '#lib/components/JamSearch.svelte';
	import PlayerCard from '#lib/components/PlayerCard.svelte';
	import TeamCard from '#lib/components/TeamCard.svelte';
	import { APP_NAME, TAGLINE, REPOSITORY_URL, FEATURE_REQUEST_URL } from '#lib/config.ts';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Check from '@lucide/svelte/icons/check';
	import Clock from '@lucide/svelte/icons/clock';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import UserRoundSearch from '@lucide/svelte/icons/user-round-search';
	import Users from '@lucide/svelte/icons/users';
	import RoleIcon from '#lib/components/RoleIcon.svelte';
	import { ROLES, ROLE_LABELS } from '#lib/profile.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const s = $derived(data.stats);
	const communityStats = $derived([
		{ label: 'Ongoing jams', value: s.runningJams },
		{ label: 'Upcoming jams', value: s.upcomingJams },
		{ label: 'Open teams', value: s.openTeams },
		{ label: 'People looking for teams', value: s.looking }
	]);
	const signedIn = $derived(!!data.user);

	// Illustrative examples for the "how it works" previews (rendered with the real components).
	const exampleUser = {
		username: 'mika',
		displayName: 'Mika',
		avatarUrl: null,
		experience: 'veteran' as const,
		timezone: 'Europe/Berlin',
		tools: ['Aseprite', 'Krita']
	};
	const exampleTeam = {
		id: 'example',
		name: 'Night Owls',
		description: 'Short, polished puzzle-platformer in Godot.',
		openRoles: ['audio' as const],
		status: 'open' as const,
		members: [
			{ id: '1', username: 'devon', displayName: 'Devon', avatarUrl: null },
			{ id: '2', username: 'mika', displayName: 'Mika', avatarUrl: null }
		]
	};

	const audiences = [
		{
			icon: UserRoundSearch,
			title: 'Looking for a team?',
			points: [
				'Post once per jam and let teams find you',
				'Ask to join a team that needs your skills',
				'Or team up with another solo jammer and start your own'
			]
		},
		{
			icon: UserPlus,
			title: 'Building a team?',
			points: [
				"List the roles you're missing",
				'Browse artists, coders and musicians who are free',
				'Invite them and manage requests in one inbox'
			]
		}
	];

	const features = [
		{
			icon: CalendarDays,
			title: 'Organised by jam',
			text: 'Jams are imported from itch.io automatically, so every jam already has a board waiting.'
		},
		{
			icon: Users,
			title: 'Find the right roles',
			text: 'Art, code, audio, design, writing, QA. See at a glance who does what and which teams need it.'
		},
		{
			icon: Clock,
			title: 'Timezones that work',
			text: 'See how many waking hours you share with each person before you team up.'
		},
		{
			icon: ShieldCheck,
			title: 'Real itch.io people',
			text: 'Everyone signs in with itch.io. Contact details are only shown to signed-in users.'
		}
	];

	const faqs = [
		{
			id: 'free-forever',
			question: 'Is Jamigos free?',
			answers: [
				'Yep. This is a hobby project, not a business. I’m not trying to make money from it, and I never plan to charge for any feature.'
			]
		},
		{
			id: 'fan-project',
			question: 'Who made this? Is it part of itch.io?',
			answers: [
				'I made Jamigos as a fan project for people joining game jams. It’s not affiliated with itch.io.',
				'I vibe coded it with Claude and Codex. I can code, but writing the whole thing by hand didn’t feel worth the time with these tools around.'
			]
		},
		{
			id: 'feature-requests',
			question: 'Can I request a feature or help out?',
			answers: [
				'Please do! If something’s missing, open an issue on GitHub and tell me what you’d like to do. You can report bugs there too.',
				'Jamigos is open source, and all the code is on GitHub. If you’d rather build the feature yourself, pull requests are welcome.'
			],
			links: [
				{ href: FEATURE_REQUEST_URL, label: 'Request a feature' },
				{ href: REPOSITORY_URL, label: 'Browse the code' }
			]
		},
		{
			id: 'data-storage',
			question: 'What data do you keep?',
			answers: [
				'When you sign in, we save your public itch.io profile: user ID, username, display name, avatar URL and profile link. We don’t get your password or email address, and we don’t save the itch.io access token in our database.',
				'We also save what you add here: your skills, tools, experience, timezone, bio, Discord username and portfolio links; your posts, teams and memberships; and invitations, join requests and team-up requests, including their messages and whether they were accepted, declined or withdrawn.',
				'The database keeps your notifications and whether you’ve read them, when your account and activity were created or updated, and whether you’ve finished setting up your profile. To keep you signed in, it stores a hashed version of your login token and its expiry date. We also keep a copy of the public jam listings.'
			]
		},
		{
			id: 'data-visibility',
			question: 'Who can see my information?',
			answers: [
				'Anyone can see your profile, portfolio links, posts and teams. Your Discord username is only shown to people who are signed in.',
				'Request messages are only shown to the people involved, including the team owner for team requests. Your notifications are just for you. The code is public on GitHub; the user database isn’t.'
			]
		},
		{
			id: 'contact-teammates',
			question: 'How do I talk to my teammates?',
			answers: [
				'There’s no chat here. Use the Contact button to find someone’s Discord username, if they’ve added one, or visit their itch.io profile.'
			]
		},
		{
			id: 'missing-jams',
			question: 'My jam isn’t listed. Can I add it?',
			answers: [
				'Yes. Paste its itch.io link on the Browse jams page. We import listings every few hours, but you don’t need to wait for that.'
			]
		},
		{
			id: 'multiple-teams',
			question: 'Can I join more than one team?',
			answers: ['You can join one team per jam, and as many different jams as you like.']
		}
	];
</script>

<svelte:head><title>{APP_NAME} · Find teammates for itch.io game jams</title></svelte:head>

<section
	class="bleed -mt-6 border-b border-border bg-surface-2 py-4 sm:-mt-8 sm:py-5"
	aria-label="Community stats"
>
	<dl class="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-4 text-center sm:grid-cols-4">
		{#each communityStats as stat (stat.label)}
			<div class="flex min-w-0 flex-col gap-1">
				<dt class="order-2 text-xs text-muted sm:text-sm">{stat.label}</dt>
				<dd class="order-1 text-2xl font-black tabular-nums sm:text-3xl">
					{stat.value.toLocaleString('en')}
				</dd>
			</div>
		{/each}
	</dl>
</section>

<!-- 1. Hero: what is this, in one glance -->
<section class="mx-auto max-w-3xl pt-4 pb-10 text-center sm:pt-8 sm:pb-16">
	<div class="mx-auto h-36 w-36 sm:h-44 sm:w-44">
		<img
			class="only-light h-full w-full"
			src="/brand/icons/jamigos-team-light.svg"
			alt=""
			width="176"
			height="176"
		/>
		<img
			class="only-dark h-full w-full"
			src="/brand/icons/jamigos-team-dark.svg"
			alt=""
			width="176"
			height="176"
		/>
	</div>
	<p class="mt-5 eyebrow text-accent">For itch.io game jams</p>
	<h1 class="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
		Find your <span class="text-accent">party</span>.<br class="hidden sm:block" /> Make your game.
	</h1>
	<p class="mx-auto mt-5 max-w-2xl text-lg text-muted sm:text-xl">
		{APP_NAME} helps artists, programmers, musicians, designers and writers find teammates for
		<strong class="text-text">itch.io game jams</strong>. Say what you're good at, pick a jam, and
		team up with people who need your skills.
	</p>
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		{#if signedIn}
			<a href="/jams" class="btn-primary btn-lg">Find a jam</a>
			<a href="/teams" class="btn-ghost btn-lg">My teams</a>
			<a href="/u/{data.user?.username}" class="btn-ghost btn-lg">Your profile</a>
		{:else}
			<a href="/login?next=/jams" class="btn-primary btn-lg">Get started with itch.io</a>
			<a href="/jams" class="btn-ghost btn-lg">Browse jams</a>
		{/if}
	</div>
	<p class="mt-4 text-sm text-muted">Free · Sign in with your itch.io account · No email needed</p>
</section>

<!-- 2. How it works: show the product, don't just describe it -->
<section class="bleed bg-surface-2 py-14 sm:py-20" aria-labelledby="how-title">
	<div class="mx-auto max-w-6xl">
		<p class="text-center eyebrow">How it works</p>
		<h2 id="how-title" class="mt-2 text-center text-3xl font-black sm:text-4xl">
			From solo to squad in three steps
		</h2>

		<ol class="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-6">
			<li class="flex flex-col lg:row-span-3 lg:grid lg:grid-rows-subgrid">
				<div class="flex items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button font-black text-on-button"
						>1</span
					>
					<h3 class="text-lg font-bold">Show what you do</h3>
				</div>
				<p class="mt-2 text-muted">
					Sign in with itch.io and pick your skills, tools and timezone. It takes about a minute.
				</p>
				<div class="mt-5 card p-4" inert aria-hidden="true">
					<div class="flex flex-wrap gap-1.5">
						<!-- Mirrors the onboarding role picker: "Art" selected. -->
						{#each ROLES.slice(0, 5) as role (role)}
							<span
								class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs {role ===
								'art'
									? 'border-accent bg-accent/10 font-bold'
									: 'border-border text-muted'}"
							>
								<RoleIcon {role} size={13} />{ROLE_LABELS[role]}
							</span>
						{/each}
					</div>
					<div class="mt-3 flex flex-wrap gap-1.5 text-xs">
						{#each ['Aseprite', 'Krita', 'Godot'] as tool (tool)}
							<span class="rounded-md bg-surface-2 px-2 py-0.5 font-bold">{tool}</span>
						{/each}
					</div>
					<p class="mt-3 flex items-center gap-1.5 text-xs text-muted">
						<Clock size={13} aria-hidden="true" />Europe/Berlin · UTC+1
					</p>
				</div>
			</li>

			<li class="flex flex-col lg:row-span-3 lg:grid lg:grid-rows-subgrid">
				<div class="flex items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button font-black text-on-button"
						>2</span
					>
					<h3 class="text-lg font-bold">Pick your jam</h3>
				</div>
				<p class="mt-2 text-muted">
					Every jam has its own board. Post that you're looking for a team, or start a team and list
					the roles you need.
				</p>
				<div class="mt-5 flex flex-col" inert aria-hidden="true">
					<PlayerCard
						user={exampleUser}
						roles={['art']}
						message="Looking for a programmer who likes cozy games. I can do all the art + UI."
						updatedAt={new Date()}
					/>
				</div>
			</li>

			<li class="flex flex-col lg:row-span-3 lg:grid lg:grid-rows-subgrid">
				<div class="flex items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button font-black text-on-button"
						>3</span
					>
					<h3 class="text-lg font-bold">Team up and jam</h3>
				</div>
				<p class="mt-2 text-muted">
					Team up with another solo jammer, ask to join a team, or invite people. Once you're a
					team, you'll see how to reach each other on Discord.
				</p>
				<div class="mt-5 flex flex-col" inert aria-hidden="true">
					<TeamCard team={exampleTeam}>
						{#snippet actions()}
							<span class="btn-primary btn-sm">Ask to join</span>
						{/snippet}
					</TeamCard>
				</div>
			</li>
		</ol>
	</div>
</section>

<!-- 3. Both sides of the match -->
<section
	class="mx-auto grid max-w-5xl gap-4 py-14 sm:py-20 md:grid-cols-2"
	aria-label="Who it's for"
>
	{#each audiences as { icon: Icon, title, points } (title)}
		<div class="card card-panel">
			<span
				class="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10 text-accent"
				aria-hidden="true"
			>
				<Icon size={24} />
			</span>
			<h2 class="mt-4 text-2xl font-black">{title}</h2>
			<ul class="mt-4 space-y-2.5 text-muted">
				{#each points as point (point)}
					<li class="flex gap-2.5">
						<Check size={18} class="mt-0.5 shrink-0 text-ok" aria-hidden="true" />{point}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</section>

<!-- 4. Why Jamigos -->
<section class="mx-auto max-w-6xl pb-14 sm:pb-20" aria-labelledby="why-title">
	<h2 id="why-title" class="text-center text-3xl font-black sm:text-4xl">Made for game jams</h2>
	<div class="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
		{#each features as { icon: Icon, title, text } (title)}
			<div>
				<span
					class="flex h-11 w-11 items-center justify-center rounded-md bg-accent/10 text-accent"
					aria-hidden="true"
				>
					<Icon size={22} />
				</span>
				<h3 class="mt-3 font-bold">{title}</h3>
				<p class="mt-1 text-sm text-muted">{text}</p>
			</div>
		{/each}
	</div>
</section>

<!-- 5. It's alive: real jams and real numbers -->
<section class="bleed bg-surface-2 py-14 sm:py-20" aria-labelledby="jams-title">
	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-2xl text-center">
			<h2 id="jams-title" class="text-3xl font-black sm:text-4xl">Already know your jam?</h2>
			<p class="mt-3 text-muted">Search for your jam to see who’s looking for a team.</p>
			<div class="mt-6 text-left"><JamSearch /></div>
		</div>

		{#if data.jams.length}
			<div class="mt-12 mb-4 flex items-baseline justify-between gap-4">
				<h3 class="text-xl font-bold">Jams to join</h3>
				<a href="/jams" class="text-sm font-bold link">Browse all jams →</a>
			</div>
			<div class="card-grid">
				{#each data.jams as jam (jam.id)}<JamCard {jam} />{/each}
			</div>
		{/if}
	</div>
</section>

<!-- 6. FAQ (native <details>: works without JavaScript) -->
<section class="mx-auto max-w-3xl py-14 sm:py-20" aria-labelledby="faq-title">
	<h2 id="faq-title" class="text-center text-3xl font-black sm:text-4xl">Questions</h2>
	<div class="mt-8 divide-y divide-border border-y border-border">
		{#each faqs as faq (faq.id)}
			<details id={faq.id} open={page.url.hash === `#${faq.id}`} class="group scroll-mt-24 py-4">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden"
				>
					{faq.question}
					<span
						class="text-xl leading-none text-muted transition-transform group-open:rotate-45"
						aria-hidden="true">+</span
					>
				</summary>
				{#each faq.answers as answer (answer)}
					<p class="mt-3 text-muted">{answer}</p>
				{/each}
				{#if faq.links}
					<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
						{#each faq.links as link (link.href)}
							<a href={link.href} class="link">{link.label} →</a>
						{/each}
					</div>
				{/if}
			</details>
		{/each}
	</div>
</section>

<!-- 7. Closing call to action -->
<section
	class="mx-auto mb-4 max-w-4xl rounded-xl bg-[#222] px-6 py-12 text-center text-white sm:py-16"
>
	<img
		src="/brand/icons/jamigos-team-dark.svg"
		alt=""
		width="96"
		height="96"
		class="mx-auto h-24 w-24"
	/>
	<h2 class="mt-4 text-3xl font-black sm:text-4xl">{TAGLINE}</h2>
	<p class="mx-auto mt-3 max-w-xl text-white/75">
		The next jam is always around the corner. Your party might already be waiting.
	</p>
	<div class="mt-7 flex flex-wrap justify-center gap-3">
		{#if signedIn}
			<a href="/jams" class="btn-primary btn-lg">Find a jam</a>
		{:else}
			<a href="/login?next=/jams" class="btn-primary btn-lg">Get started with itch.io</a>
			<a href="/jams" class="btn btn-lg border border-white/30 text-white hover:bg-white/10"
				>Browse jams</a
			>
		{/if}
	</div>
</section>
