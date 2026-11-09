// Parsers for itch.io jam HTML. itch.io has no jam API, so we read the public,
// server-rendered pages. Pure functions with no dependencies: shared by the app
// (manual "add by URL") and scripts/sync-jams.ts. Tested against saved fixtures.

export type ParsedJam = {
	slug: string;
	title: string;
	url: string;
	hostName: string | null;
	hostUrl: string | null;
	coverUrl: string | null;
	startsAt: string | null; // ISO 8601 UTC
	endsAt: string | null; // ISO 8601 UTC, end of the submission period
	joinedCount: number;
	phase: 'upcoming' | 'running' | 'voting' | 'unknown';
};

const ITCH = 'https://itch.io';

export function decodeEntities(s: string): string {
	return s
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&');
}

const stripTags = (s: string) =>
	decodeEntities(s.replace(/<[^>]+>/g, ''))
		.replace(/\s+/g, ' ')
		.trim();

const UNIT_MS: Record<string, number> = {
	second: 1000,
	minute: 60_000,
	hour: 3_600_000,
	day: 86_400_000,
	week: 7 * 86_400_000,
	month: 30 * 86_400_000,
	year: 365 * 86_400_000
};

/** "3 days" → ms; returns null when unrecognised. */
export function parseDuration(text: string): number | null {
	const m = /(\d+)\s*(second|minute|hour|day|week|month|year)s?/i.exec(text);
	return m ? Number(m[1]) * UNIT_MS[m[2].toLowerCase()] : null;
}

function toIso(value: string): string | null {
	// Accept "2027-08-11T17:00:00Z" and itch's "2027-08-11 17:00:00" (UTC).
	const normalised = /Z$|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
	const t = Date.parse(normalised);
	return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function parseCard(card: string): ParsedJam | null {
	const titleMatch = /<h3[^>]*>\s*<a href="\/jam\/([^"/?#]+)"[^>]*>([\s\S]*?)<\/a>/.exec(card);
	if (!titleMatch) return null;
	const slug = titleMatch[1];

	const host = /class="hosted_by[^"]*"[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(
		card
	);
	const cover = /data-background_image="([^"]+)"/.exec(card);
	const joined = /<span class="number">([\d,]+)<\/span>\s*joined/.exec(card);

	let startsAt: string | null = null;
	let endsAt: string | null = null;
	let phase: ParsedJam['phase'] = 'unknown';

	const dateRow = /class="timestmap[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(card)?.[1] ?? '';
	const label = stripTags(dateRow.split('<span')[0] ?? '').toLowerCase();
	const iso = /class="date_countdown"[^>]*>([^<]+)</.exec(dateRow)?.[1];
	const when = iso ? toIso(iso.trim()) : null;
	const duration = parseDuration(/class="date_duration"[^>]*>([^<]+)</.exec(dateRow)?.[1] ?? '');

	if (label.includes('starts in')) {
		phase = 'upcoming';
		startsAt = when;
		if (when && duration) endsAt = new Date(Date.parse(when) + duration).toISOString();
	} else if (label.includes('submission') && label.includes('close')) {
		phase = 'running';
		endsAt = when;
	} else if (label.includes('voting')) {
		phase = 'voting';
	}

	return {
		slug,
		title: stripTags(titleMatch[2]),
		url: `${ITCH}/jam/${slug}`,
		hostName: host ? stripTags(host[2]) : null,
		hostUrl: host ? new URL(decodeEntities(host[1]), ITCH).toString() : null,
		coverUrl: cover ? decodeEntities(cover[1]) : null,
		startsAt,
		endsAt,
		joinedCount: joined ? Number(joined[1].replace(/,/g, '')) : 0,
		phase
	};
}

/** Parses a listing page such as https://itch.io/jams/upcoming?page=2. */
export function parseJamListing(html: string): { jams: ParsedJam[]; totalPages: number | null } {
	const chunks = html.split(/<div class="jam(?: [^"]*)?">/).slice(1);
	const jams = chunks.map(parseCard).filter((j): j is ParsedJam => j !== null);
	const pages = /Page \d+ of\s*(?:<a[^>]*>)?\s*(\d+)/.exec(html);
	return { jams, totalPages: pages ? Number(pages[1]) : null };
}

/** Extracts a slug from inputs like "https://itch.io/jam/gmtk-2027/entries" or "gmtk-2027". */
export function jamSlugFromUrl(input: string): string | null {
	const trimmed = input.trim();
	const m = /^(?:https?:\/\/)?(?:www\.)?itch\.io\/jam\/([a-z0-9-]+)/i.exec(trimmed);
	if (m) return m[1].toLowerCase();
	return /^[a-z0-9-]+$/i.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** Parses a single jam page such as https://itch.io/jam/gmtk-2027. */
export function parseJamPage(html: string, slug: string): ParsedJam | null {
	const meta = (prop: string) =>
		new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${prop}"`).exec(html)?.[1] ??
		new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`).exec(html)?.[1];

	const title = meta('og:title') ?? /<title>([^<]*?)(?: - itch\.io)?<\/title>/.exec(html)?.[1];
	if (!title) return null;

	const start = /"start_date":"([^"]+)"/.exec(html)?.[1];
	const end = /"end_date":"([^"]+)"/.exec(html)?.[1];
	const startsAt = start ? toIso(start) : null;
	const endsAt = end ? toIso(end) : null;

	const hostBlock = /class="jam_host_header"[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(
		html
	);
	const joined = /([\d,]+)<\/div>\s*<div[^>]*>\s*Joined/i.exec(html);

	const now = Date.now();
	const phase: ParsedJam['phase'] =
		startsAt && Date.parse(startsAt) > now
			? 'upcoming'
			: endsAt && Date.parse(endsAt) > now
				? 'running'
				: endsAt
					? 'voting'
					: 'unknown';

	return {
		slug,
		title: decodeEntities(title).trim(),
		url: `${ITCH}/jam/${slug}`,
		hostName: hostBlock ? stripTags(hostBlock[2]) || null : null,
		hostUrl: hostBlock ? new URL(decodeEntities(hostBlock[1]), ITCH).toString() : null,
		coverUrl: meta('twitter:image') ?? meta('og:image') ?? null,
		startsAt,
		endsAt,
		joinedCount: joined ? Number(joined[1].replace(/,/g, '')) : 0,
		phase
	};
}
