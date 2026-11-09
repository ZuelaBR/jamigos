import { readFileSync } from 'node:fs';
import type { FullConfig } from '@playwright/test';
import { parseJamListing } from '../src/lib/jams/parse.ts';

// Loads real itch.io jams (saved listing pages in src/lib/jams/fixtures) into the E2E
// database through the same sync endpoint the production crawler uses. Using saved pages
// instead of live itch.io keeps tests fast, deterministic, and clear of rate limits.
export default async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0].use.baseURL!;
	const secret = /^SYNC_SECRET=(.*)$/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1]?.trim();
	if (!secret) throw new Error('SYNC_SECRET missing from .dev.vars (copy .dev.vars.example)');

	const jams = ['in-progress.html', 'upcoming.html'].flatMap(
		(file) => parseJamListing(readFileSync(`src/lib/jams/fixtures/${file}`, 'utf8')).jams
	);

	for (let i = 0; i < jams.length; i += 100) {
		const res = await fetch(`${baseURL}/api/internal/jams/sync`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
			body: JSON.stringify({ jams: jams.slice(i, i + 100) })
		});
		if (!res.ok) throw new Error(`Seeding jams failed: ${res.status} ${await res.text()}`);
	}

	const used = config.projects.map((p) => p.metadata.jam as string);
	for (const slug of used) {
		if (!jams.some((j) => j.slug === slug))
			throw new Error(`Test jam "${slug}" is not in the fixtures`);
	}
}
