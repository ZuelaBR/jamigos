<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import TeamCard from '#lib/components/TeamCard.svelte';
	import { jamTiming } from '#lib/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const sections = $derived([
		{ title: 'Current teams', teams: data.current },
		{ title: 'Past jams', teams: data.past }
	]);
</script>

<svelte:head><title>My teams · Jamigos</title></svelte:head>

<div class="mx-auto max-w-6xl">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold sm:text-3xl">My teams</h1>
			<p class="mt-1 text-muted">All the teams you’ve joined or started, in one place.</p>
		</div>
		<a href="/jams" class="btn-ghost">Find a jam</a>
	</div>

	{#if !data.current.length && !data.past.length}
		<div class="mt-6">
			<EmptyState icon={Users} title="You haven’t joined a team yet">
				<p>Pick a jam to start your own team or find one to join.</p>
				<a href="/jams" class="mt-4 btn-primary">Browse jams</a>
			</EmptyState>
		</div>
	{:else}
		{#each sections as section (section.title)}
			{#if section.teams.length}
				<section class="mt-8" aria-label={section.title}>
					<h2 class="mb-3 text-lg font-bold">
						{section.title} <span class="font-normal text-muted">({section.teams.length})</span>
					</h2>
					<div class="card-grid">
						{#each section.teams as team (team.id)}
							<div class="row-span-3 grid min-w-0 grid-rows-subgrid gap-2">
								<div class="flex flex-wrap items-baseline justify-between gap-2 text-xs">
									<a href="/jams/{team.jam.slug}" class="min-w-0 font-bold link">{team.jam.title}</a
									>
									<span class="text-muted">{team.isOwner ? 'You own this team' : 'Member'}</span>
								</div>
								<TeamCard {team}>
									{#snippet actions()}
										<a href="/teams/{team.id}" class="btn-primary btn-sm"
											>{team.isOwner ? 'Manage team' : 'View team'}</a
										>
										<a href="/jams/{team.jam.slug}" class="btn-ghost btn-sm">Jam board</a>
									{/snippet}
								</TeamCard>
								<p class="text-xs text-muted">{jamTiming(team.jam).label}</p>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	{/if}
</div>
