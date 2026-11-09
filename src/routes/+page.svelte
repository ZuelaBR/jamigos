<script lang="ts">
	import JamCard from '#lib/components/JamCard.svelte';
	import { APP_NAME } from '#lib/config.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const steps = [
		{
			icon: '🎨',
			title: 'Make a profile',
			text: 'Sign in with itch.io and say what you do: art, code, audio, design, writing…'
		},
		{
			icon: '🙋',
			title: 'Pick a jam',
			text: "Post that you're looking for a team, or start one and list the roles you need."
		},
		{
			icon: '🤝',
			title: 'Team up',
			text: 'Invite people or ask to join. Once matched, everyone sees how to reach each other.'
		}
	];
</script>

<section class="py-8 text-center sm:py-16">
	<p class="text-sm font-semibold tracking-wide text-accent uppercase">For itch.io game jams</p>
	<h1 class="mx-auto mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
		Find your team for the <span class="text-accent">next game jam</span>
	</h1>
	<p class="mx-auto mt-5 max-w-xl text-lg text-muted">
		Artists, coders, musicians and designers looking for each other, organised by jam. Free, and you
		sign in with itch.io.
	</p>
	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<a href="/jams" class="btn-primary px-6 py-3 text-base">Browse jams</a>
		{#if !data.user}
			<a href="/login?next=/jams" class="btn-ghost px-6 py-3 text-base">Sign in with itch.io</a>
		{/if}
	</div>
</section>

<section class="grid gap-4 sm:grid-cols-3">
	{#each steps as step, i (step.title)}
		<div class="card p-5">
			<div class="text-3xl" aria-hidden="true">{step.icon}</div>
			<h2 class="mt-3 font-semibold"><span class="text-muted">{i + 1}.</span> {step.title}</h2>
			<p class="mt-1 text-sm text-muted">{step.text}</p>
		</div>
	{/each}
</section>

{#if data.running.length}
	<section class="mt-14">
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="text-xl font-bold">Happening now</h2>
			<a href="/jams" class="text-sm text-muted hover:text-text">See all →</a>
		</div>
		<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each data.running as jam (jam.id)}<JamCard {jam} />{/each}
		</div>
	</section>
{/if}

{#if data.upcoming.length}
	<section class="mt-12">
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="text-xl font-bold">Starting soon</h2>
			<a href="/jams?tab=upcoming" class="text-sm text-muted hover:text-text">See all →</a>
		</div>
		<div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
			{#each data.upcoming as jam (jam.id)}<JamCard {jam} />{/each}
		</div>
	</section>
{/if}

<p class="mt-14 text-center text-xs text-muted">
	{APP_NAME} imports public jam listings from itch.io every few hours.
</p>
