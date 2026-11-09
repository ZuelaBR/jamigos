<script lang="ts">
	import Bug from '@lucide/svelte/icons/bug';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import CodeXml from '@lucide/svelte/icons/code-xml';
	import Music from '@lucide/svelte/icons/music';
	import Palette from '@lucide/svelte/icons/palette';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Puzzle from '@lucide/svelte/icons/puzzle';
	import type { Role } from '#lib/profile.ts';

	let { role, size = 14 }: { role: Role; size?: number } = $props();

	const ICONS = {
		code: CodeXml,
		art: Palette,
		audio: Music,
		design: Puzzle,
		writing: PenLine,
		qa: Bug,
		producer: ClipboardList
	} satisfies Record<Role, unknown>;

	const Icon = $derived(ICONS[role]);
</script>

<Icon {size} strokeWidth={2.25} class="shrink-0" aria-hidden="true" />
