import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jamSlugFromUrl, parseDuration, parseJamListing, parseJamPage } from './parse';

const fixture = (name: string) =>
	readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parseJamListing (upcoming)', () => {
	const { jams, totalPages } = parseJamListing(fixture('upcoming.html'));

	it('finds every card and the page count', () => {
		expect(jams).toHaveLength(50);
		expect(totalPages).toBeGreaterThan(1);
	});

	it('extracts all fields for a known jam', () => {
		const gmtk = jams.find((j) => j.slug === 'gmtk-2027');
		expect(gmtk).toMatchObject({
			title: 'GMTK Game Jam 2027',
			url: 'https://itch.io/jam/gmtk-2027',
			hostName: "Game Maker's Toolkit",
			hostUrl: 'https://gmtk.itch.io/',
			startsAt: '2027-08-11T17:00:00.000Z',
			endsAt: '2027-08-15T17:00:00.000Z',
			phase: 'upcoming'
		});
		expect(gmtk!.joinedCount).toBeGreaterThan(1000);
		expect(gmtk!.coverUrl).toMatch(/^https:\/\/img\.itch\.zone\//);
	});

	it('gives every upcoming jam a start date and decoded title', () => {
		for (const j of jams) {
			expect(j.phase).toBe('upcoming');
			expect(j.startsAt).not.toBeNull();
			expect(j.title).not.toMatch(/&#?\w+;/);
			expect(j.slug).toMatch(/^[a-z0-9-]+$/);
		}
	});
});

describe('parseJamListing (in progress)', () => {
	const { jams } = parseJamListing(fixture('in-progress.html'));

	it('marks running jams with a submission deadline', () => {
		expect(jams).toHaveLength(50);
		for (const j of jams) {
			expect(j.phase).toBe('running');
			expect(j.endsAt).not.toBeNull();
		}
	});
});

describe('parseJamListing (unexpected markup)', () => {
	it('returns nothing instead of throwing', () => {
		expect(parseJamListing('<html><body>maintenance</body></html>')).toEqual({
			jams: [],
			totalPages: null
		});
	});
});

describe('parseJamPage', () => {
	it('reads title, dates and cover from a jam page', () => {
		const jam = parseJamPage(fixture('jam-page.html'), 'gmtk-2027');
		expect(jam).toMatchObject({
			slug: 'gmtk-2027',
			title: 'GMTK Game Jam 2027',
			startsAt: '2027-08-11T17:00:00.000Z',
			endsAt: '2027-08-15T17:00:00.000Z'
		});
		expect(jam!.coverUrl).toMatch(/^https:\/\/img\.itch\.zone\//);
		expect(jam!.hostName).toBe("Game Maker's Toolkit");
	});
});

describe('helpers', () => {
	it('parses durations', () => {
		expect(parseDuration('3 days')).toBe(3 * 86_400_000);
		expect(parseDuration('1 hour')).toBe(3_600_000);
		expect(parseDuration('soon')).toBeNull();
	});

	it('extracts slugs from urls', () => {
		expect(jamSlugFromUrl('https://itch.io/jam/gmtk-2027')).toBe('gmtk-2027');
		expect(jamSlugFromUrl('itch.io/jam/GMTK-2027/entries')).toBe('gmtk-2027');
		expect(jamSlugFromUrl('gmtk-2027')).toBe('gmtk-2027');
		// Real itch.io slugs can start with a dash.
		expect(jamSlugFromUrl('https://itch.io/jam/-pixel-deck-jam-1')).toBe('-pixel-deck-jam-1');
		expect(jamSlugFromUrl('https://evil.com/jam/x')).toBeNull();
		expect(jamSlugFromUrl('../../etc')).toBeNull();
	});
});
