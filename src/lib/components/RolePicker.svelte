<script lang="ts">
	import { ROLES, ROLE_ICONS, ROLE_LABELS, type Role } from '#lib/profile.ts';

	let { name, selected = $bindable([]) }: { name: string; selected?: Role[] } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each ROLES as role (role)}
		<label
			class="cursor-pointer rounded-full border border-border px-3 py-1 text-sm transition-colors hover:bg-surface-2 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
		>
			<input type="checkbox" {name} value={role} bind:group={selected} class="sr-only" />
			<span aria-hidden="true">{ROLE_ICONS[role]}</span>
			{ROLE_LABELS[role]}
		</label>
	{/each}
</div>
