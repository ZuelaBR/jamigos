<script lang="ts">
	let {
		user,
		size = 40
	}: {
		user: { username: string; displayName?: string | null; avatarUrl?: string | null };
		size?: number;
	} = $props();
	const name = $derived(user.displayName || user.username);
	// Deterministic background colour from the username.
	const hue = $derived([...user.username].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0));
</script>

{#if user.avatarUrl}
	<img
		src={user.avatarUrl}
		alt=""
		width={size}
		height={size}
		class="shrink-0 rounded-full object-cover"
		style="width:{size}px;height:{size}px"
		loading="lazy"
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
		style="width:{size}px;height:{size}px;background:hsl({hue} 45% 38%);font-size:{size * 0.42}px"
	>
		{name[0]?.toUpperCase()}
	</span>
{/if}
