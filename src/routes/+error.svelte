<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Something went wrong · Jamigos</title></svelte:head>

<div class="mx-auto max-w-md py-16 text-center">
	<div class="mx-auto h-28 w-28" aria-hidden="true">
		<img
			class="only-light h-full w-full"
			src="/brand/icons/jamigos-team-light.svg"
			alt=""
			width="112"
			height="112"
		/>
		<img
			class="only-dark h-full w-full"
			src="/brand/icons/jamigos-team-dark.svg"
			alt=""
			width="112"
			height="112"
		/>
	</div>
	<h1 class="mt-4 text-2xl font-bold">
		{page.status === 404 ? 'Nothing here' : 'Something went wrong'}
	</h1>
	<p class="mt-2 text-muted">{page.error?.message}</p>
	<div class="mt-6 flex justify-center gap-3">
		<a href="/jams" class="btn-primary">Browse jams</a>
		<button class="btn-ghost" onclick={() => history.back()}>Go back</button>
	</div>
</div>
