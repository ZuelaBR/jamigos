<script lang="ts">
	import { ROLE_ICONS, ROLE_LABELS, type Role } from '#lib/profile.ts';

	let { role, variant = 'has' }: { role: Role; variant?: 'has' | 'wanted' } = $props();
</script>

<span
	class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap {variant ===
	'wanted'
		? 'border border-dashed border-accent/60 text-accent'
		: 'bg-surface-2 text-text'}"
>
	<span aria-hidden="true">{ROLE_ICONS[role]}</span>
	{variant === 'wanted' ? `Needs ${ROLE_LABELS[role].toLowerCase()}` : ROLE_LABELS[role]}
</span>
