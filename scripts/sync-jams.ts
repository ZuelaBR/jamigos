/**
 * Crawls itch.io's public jam listings and pushes them to the app.
 *
 *   SYNC_URL=https://jamigos.example.workers.dev SYNC_SECRET=… npm run sync:jams
 *
 * Env:
 *   SYNC_URL       App base URL (default http://localhost:5173)
 *   SYNC_SECRET    Must match the app's SYNC_SECRET (default: read from .dev.vars)
 *   SYNC_PAGES     Max pages per listing (default 10, 50 jams per page)
 *   SYNC_DELAY_MS  Delay between itch.io requests (default 5000)
 *
 * itch.io rate-limits aggressively, so requests are sequential, slow, and back off on 429.
 */
import { readFileSync } from 'node:fs';
import { parseJamListing, type ParsedJam } from '../src/lib/jams/parse.ts';

const LISTINGS = ['in-progress', 'upcoming'] as const;
const USER_AGENT = 'Jamigos/1.0 (+https://github.com/; game jam team finder, polite crawler)';

function devSecret() {
	try {
		return /^SYNC_SECRET=(.*)$/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1]?.trim();
	} catch {
		return undefined;
	}
}

const BASE_URL = (process.env.SYNC_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const SECRET = process.env.SYNC_SECRET || devSecret();
const MAX_PAGES = Number(process.env.SYNC_PAGES ?? 10);
const DELAY_MS = Number(process.env.SYNC_DELAY_MS ?? 5000);
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchItch(url: string): Promise<string> {
	for (let attempt = 0; ; attempt++) {
		const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
		if (res.ok) return res.text();
		if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
			const retryAfter = Number(res.headers.get('retry-after'));
			const wait = retryAfter > 0 ? retryAfter * 1000 : DELAY_MS * 2 ** (attempt + 1);
			console.warn(`  ${res.status} from itch.io, waiting ${Math.round(wait / 1000)}s…`);
			await sleep(wait);
			continue;
		}
		throw new Error(`GET ${url} failed with ${res.status}`);
	}
}

async function crawl(listing: (typeof LISTINGS)[number]): Promise<ParsedJam[]> {
	const found: ParsedJam[] = [];
	let totalPages = 1;
	for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
		const url = `https://itch.io/jams/${listing}${page > 1 ? `?page=${page}` : ''}`;
		const html = await fetchItch(url);
		const result = parseJamListing(html);
		// An empty page on a 200 almost certainly means itch.io changed its markup.
		if (!result.jams.length) throw new Error(`Parsed 0 jams from ${url}; did the markup change?`);
		totalPages = result.totalPages ?? 1;
		found.push(...result.jams);
		console.log(`  ${listing} page ${page}/${totalPages}: ${result.jams.length} jams`);
		await sleep(DELAY_MS);
	}
	return found;
}

async function push(batch: ParsedJam[]) {
	const res = await fetch(`${BASE_URL}/api/internal/jams/sync`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SECRET}` },
		body: JSON.stringify({ jams: batch })
	});
	if (!res.ok) {
		const body = await res.text();
		const index = /jams\.(\d+)\./.exec(body)?.[1];
		const culprit = index ? `\n  offending jam: ${JSON.stringify(batch[Number(index)])}` : '';
		throw new Error(`Sync endpoint returned ${res.status}: ${body}${culprit}`);
	}
	return (await res.json()) as { upserted: number; skipped: number };
}

async function main() {
	if (!SECRET) throw new Error('SYNC_SECRET is not set');

	const bySlug = new Map<string, ParsedJam>();
	for (const listing of LISTINGS) {
		console.log(`Crawling /jams/${listing}…`);
		for (const jam of await crawl(listing)) bySlug.set(jam.slug, jam);
	}

	const all = [...bySlug.values()];
	let upserted = 0;
	for (let i = 0; i < all.length; i += 100) {
		upserted += (await push(all.slice(i, i + 100))).upserted;
	}
	console.log(`Done: ${all.length} jams found, ${upserted} upserted into ${BASE_URL}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
