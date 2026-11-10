<script lang="ts">
	let {
		user,
		size = 40
	}: {
		user: { username: string; displayName?: string | null; avatarUrl?: string | null };
		size?: number;
	} = $props();
	const name = $derived(user.displayName || user.username);
	let failedUrl = $state<string | null>(null);
	// Deterministic background colour from the username.
	const hue = $derived([...user.username].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0));
</script>

{#if user.avatarUrl && user.avatarUrl !== failedUrl}
	<img
		src={user.avatarUrl}
		alt={name}
		onerror={() => (failedUrl = user.avatarUrl ?? null)}
		width={size}
		height={size}
		class="shrink-0 rounded-full object-cover"
		style="width:{size}px;height:{size}px"
		loading="lazy"
	/>
{:else}
	<span
		role="img"
		aria-label={name}
		class="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
		style="width:{size}px;height:{size}px;background:hsl({hue} 45% 38%);font-size:{size * 0.42}px"
	>
		{name[0]?.toUpperCase()}
	</span>
{/if}
