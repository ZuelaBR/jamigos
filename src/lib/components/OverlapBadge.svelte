<script lang="ts">
	import { formatOffset, offsetMinutes, overlapHours, overlapLevel } from '#lib/tz.ts';

	let { timezone, viewerTimezone }: { timezone: string; viewerTimezone?: string | null } = $props();

	const offset = $derived(offsetMinutes(timezone));
	const hours = $derived(
		viewerTimezone ? overlapHours(offset, offsetMinutes(viewerTimezone)) : null
	);
	const level = $derived(hours === null ? null : overlapLevel(hours));
	const colour = { great: 'text-ok', ok: 'text-warn', low: 'text-accent' };
</script>

<span
	class="inline-flex items-center gap-1.5 text-xs text-muted"
	title={timezone.replaceAll('_', ' ')}
>
	<span aria-hidden="true">🕒</span>{formatOffset(offset)}
	{#if hours !== null && level}
		<span aria-hidden="true">·</span>
		<span
			class="whitespace-nowrap {colour[level]}"
			title="About {hours} waking hours overlap with yours each day"
			>~{hours}h overlap<span class="sr-only"> with you</span></span
		>
	{/if}
</span>
