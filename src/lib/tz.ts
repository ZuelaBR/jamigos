// Timezone helpers shared by client and server. All pure + Intl-based (works in Workers).

/** Minutes east of UTC for `timeZone` at `date` (e.g. Europe/Rome in summer → 120). */
export function offsetMinutes(timeZone: string, date = new Date()): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric'
	}).formatToParts(date);
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
	return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000);
}

export function formatOffset(minutes: number): string {
	const sign = minutes < 0 ? '−' : '+';
	const abs = Math.abs(minutes);
	const h = Math.floor(abs / 60);
	const m = abs % 60;
	return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

export function isValidTimeZone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

// Assume people are typically available 09:00–24:00 local time during a jam.
const AWAKE_START = 9 * 60;
const AWAKE_END = 24 * 60;

/**
 * Hours per day both people are likely awake, given their UTC offsets.
 * Windows are compared on a 24h circle, so UTC−10 and UTC+12 are handled.
 */
export function overlapHours(offsetA: number, offsetB: number): number {
	const DAY = 24 * 60;
	const awake = (offset: number) => {
		const mins = new Uint8Array(DAY);
		for (let t = AWAKE_START; t < AWAKE_END; t++) mins[(((t - offset) % DAY) + DAY) % DAY] = 1;
		return mins;
	};
	const a = awake(offsetA);
	const b = awake(offsetB);
	let shared = 0;
	for (let i = 0; i < DAY; i++) shared += a[i] & b[i];
	return Math.round(shared / 60);
}

export function overlapLabel(tzA: string, tzB: string, date = new Date()): string {
	const hours = overlapHours(offsetMinutes(tzA, date), offsetMinutes(tzB, date));
	return `~${hours}h overlap`;
}

export function overlapLevel(hours: number): 'great' | 'ok' | 'low' {
	return hours >= 10 ? 'great' : hours >= 5 ? 'ok' : 'low';
}

export function timeZoneOptions(): string[] {
	const supported = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
	return ['UTC', ...(supported ? supported('timeZone').filter((zone) => zone !== 'UTC') : [])];
}
