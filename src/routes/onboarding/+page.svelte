<script lang="ts">
	import ProfileForm from '#lib/components/ProfileForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Set up your profile · Jamigos</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<h1 class="text-2xl font-bold sm:text-3xl">
		Welcome, {data.user?.displayName || data.user?.username}! 👋
	</h1>
	<p class="mt-2 text-muted">
		Tell other jammers what you're good at. It takes about a minute, and you can change it any time.
	</p>
	<div class="mt-8 card p-5 sm:p-8">
		<ProfileForm
			values={data.values}
			errors={form?.errors}
			wizard
			detectTimezone
			submitLabel="Finish & find a jam"
		/>
	</div>
</div>
