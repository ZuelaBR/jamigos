const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 86_400_000],
	['month', 30 * 86_400_000],
	['week', 7 * 86_400_000],
	['day', 86_400_000],
	['hour', 3_600_000],
	['minute', 60_000]
];

/** "in 3 days", "2 hours ago" */
export function relativeTime(date: Date | string | number, now = Date.now()): string {
	const diff = new Date(date).getTime() - now;
	for (const [unit, ms] of UNITS) {
		if (Math.abs(diff) >= ms || unit === 'minute') return rtf.format(Math.round(diff / ms), unit);
	}
	return 'now';
}

export function jamTiming(jam: { startsAt: Date | null; endsAt: Date | null }, now = Date.now()) {
	if (jam.startsAt && jam.startsAt.getTime() > now)
		return { label: `Starts ${relativeTime(jam.startsAt, now)}`, live: false };
	if (jam.endsAt && jam.endsAt.getTime() > now)
		return { label: `Submissions close ${relativeTime(jam.endsAt, now)}`, live: true };
	if (jam.endsAt) return { label: `Ended ${relativeTime(jam.endsAt, now)}`, live: false };
	return { label: 'Dates unknown', live: false };
}

export function formatDate(date: Date) {
	return date.toLocaleString('en', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
}
