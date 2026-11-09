<script lang="ts">
	import JamCard from '#lib/components/JamCard.svelte';
	import JamSearch from '#lib/components/JamSearch.svelte';
	import PlayerCard from '#lib/components/PlayerCard.svelte';
	import TeamCard from '#lib/components/TeamCard.svelte';
	import { APP_NAME, TAGLINE } from '#lib/config.ts';
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
	const signedIn = $derived(!!data.user);
	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
				'Filter teams by the roles they still need',
				'Ask to join with a short hello'
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
		['Is Jamigos free?', 'Yes, completely. There are no paid features.'],
		[
			'Is this an official itch.io site?',
			`No. ${APP_NAME} is a fan-made tool and isn't affiliated with itch.io. You sign in with your itch.io account, so everyone you meet here is a real itch.io user.`
		],
		[
			'What can Jamigos see from my itch.io account?',
			'Only your public profile: username, display name, avatar and profile link. Never your password or email address.'
		],
		[
			'How do I talk to my teammates?',
			"There's no chat. Profiles show a Discord username and the itch.io profile, and only signed-in users can see them."
		],
		[
			"My jam isn't listed. What do I do?",
			'Jams are imported from itch.io automatically every few hours. For anything missing, paste the jam link on the Browse jams page and it is added instantly.'
		],
		[
			'Can I be on more than one team?',
			'One team per jam, so teams know you are committed, but you can join as many jams as you like.'
		]
	];
</script>

<svelte:head><title>{APP_NAME} · Find teammates for itch.io game jams</title></svelte:head>

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
			<li class="flex flex-col">
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
				<div class="mt-5 rounded-md border border-border bg-surface p-4" inert aria-hidden="true">
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

			<li class="flex flex-col">
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
				<div class="mt-5" inert aria-hidden="true">
					<PlayerCard
						user={exampleUser}
						roles={['art']}
						message="Looking for a programmer who likes cozy games. I can do all the art + UI."
						updatedAt={new Date()}
					/>
				</div>
			</li>

			<li class="flex flex-col">
				<div class="flex items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button font-black text-on-button"
						>3</span
					>
					<h3 class="text-lg font-bold">Team up and jam</h3>
				</div>
				<p class="mt-2 text-muted">
					Invite people or ask to join a team. Once you're in, you'll see how to reach each other on
					Discord.
				</p>
				<div class="mt-5" inert aria-hidden="true">
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
		<div class="card p-6 sm:p-8">
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
			{#if s.looking || s.openTeams}
				<p class="mt-3 text-muted">
					Right now <strong class="text-text"
						>{plural(s.looking, 'jammer is', 'jammers are')}</strong
					>
					looking for a team and
					<strong class="text-text">{plural(s.openTeams, 'team is', 'teams are')}</strong> recruiting.
				</p>
			{:else}
				<p class="mt-3 text-muted">Search for it and be the first to post.</p>
			{/if}
			<div class="mt-6 text-left"><JamSearch /></div>
		</div>

		{#if data.jams.length}
			<div class="mt-12 mb-4 flex items-baseline justify-between gap-4">
				<h3 class="text-xl font-bold">Jams to join</h3>
				<a href="/jams" class="text-sm font-bold link">Browse all jams →</a>
			</div>
			<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
				{#each data.jams as jam (jam.id)}<JamCard {jam} />{/each}
			</div>
		{/if}
	</div>
</section>

<!-- 6. FAQ (native <details>: works without JavaScript) -->
<section class="mx-auto max-w-3xl py-14 sm:py-20" aria-labelledby="faq-title">
	<h2 id="faq-title" class="text-center text-3xl font-black sm:text-4xl">Questions</h2>
	<div class="mt-8 divide-y divide-border border-y border-border">
		{#each faqs as [q, a] (q)}
			<details class="group py-4">
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden"
				>
					{q}
					<span
						class="text-xl leading-none text-muted transition-transform group-open:rotate-45"
						aria-hidden="true">+</span
					>
				</summary>
				<p class="mt-2 text-muted">{a}</p>
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
