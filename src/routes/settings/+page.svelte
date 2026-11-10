<script lang="ts">
	import ProfileForm from '#lib/components/ProfileForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Edit profile · Jamigos</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<div class="flex items-baseline justify-between gap-4">
		<h1 class="text-2xl font-bold">Edit profile</h1>
		<a class="text-sm text-muted hover:text-text" href="/u/{data.user?.username}"
			>View public profile →</a
		>
	</div>
	<div class="mt-6 card card-panel">
		<ProfileForm values={data.values} errors={form && 'errors' in form ? form.errors : undefined} />
	</div>
</div>
