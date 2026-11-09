<script lang="ts">
	import RoleIcon from './RoleIcon.svelte';
	import { ROLES, ROLE_LABELS, type Role } from '#lib/profile.ts';

	let { name, selected = $bindable([]) }: { name: string; selected?: Role[] } = $props();
</script>

<div class="flex flex-wrap gap-2">
	{#each ROLES as role (role)}
		<label class="choice">
			<input type="checkbox" {name} value={role} bind:group={selected} class="sr-only" />
			<RoleIcon {role} size={15} />
			{ROLE_LABELS[role]}
		</label>
	{/each}
</div>
