import { expect, test } from '@playwright/test';
import { contextOptions } from './helpers.ts';

test('home shows community counts directly beneath the header', async ({ page }, info) => {
	await page.goto('/');
	const stats = page.getByRole('region', { name: 'Community stats', exact: true });
	for (const label of ['Ongoing jams', 'Upcoming jams', 'Open teams', 'People looking for teams']) {
		await expect(stats.getByText(label, { exact: true })).toBeVisible();
	}
	await expect(stats.locator('dd')).toHaveCount(4);
	for (const count of await stats.locator('dd').allTextContents())
		expect(count).toMatch(/^[\d,]+$/);
	const header = await page.getByRole('banner').boundingBox();
	const bounds = await stats.boundingBox();
	expect(Math.abs(bounds!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1);
	await page.screenshot({ path: info.outputPath('home.png'), fullPage: true });
});

test('home search finds a jam and opens it from the keyboard', async ({ page }) => {
	await page.goto('/');
	await page.locator('html[data-hydrated]').waitFor();
	const search = page.getByRole('combobox', { name: 'Search jams' });
	await search.fill('gmtk');
	await expect(page.getByRole('option', { name: /GMTK Game Jam 2027/ })).toBeVisible();
	await search.press('ArrowDown');
	await search.press('Enter');
	await expect(page).toHaveURL(/\/jams\/gmtk-2027$/);
	await expect(page.getByRole('heading', { level: 1, name: 'GMTK Game Jam 2027' })).toBeVisible();
});

test('home search without JavaScript falls back to the jam list', async ({ browser }) => {
	const context = await browser.newContext({ ...contextOptions(), javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/');
	await page.getByRole('combobox', { name: 'Search jams' }).fill('brackeys');
	await page.getByRole('combobox', { name: 'Search jams' }).press('Enter');
	await expect(page).toHaveURL(/\/jams\?q=brackeys/);
	await expect(page.getByText('Brackeys Game Jam 2027.1')).toBeVisible();
	await context.close();
});

test('clearing the search ignores a response even if fetch does not honor abort', async ({
	page
}) => {
	await page.goto('/');
	await page.locator('html[data-hydrated]').waitFor();
	await page.evaluate(() => {
		const original = window.fetch.bind(window);
		const control = window as typeof window & {
			searchStarted?: boolean;
			releaseSearch?: () => void;
		};
		window.fetch = (input, init) => {
			if (!String(input).startsWith('/api/jams/search?')) return original(input, init);
			control.searchStarted = true;
			// Intentionally ignore the signal to exercise the stale-response guard.
			return new Promise<Response>((resolve) => {
				control.releaseSearch = () =>
					resolve(
						new Response(
							JSON.stringify([
								{
									slug: 'gmtk-2027',
									title: 'GMTK Game Jam 2027',
									coverUrl: null,
									startsAt: null,
									endsAt: null,
									lookingCount: 0,
									teamCount: 0
								}
							]),
							{ headers: { 'Content-Type': 'application/json' } }
						)
					);
			});
		};
	});
	const search = page.getByRole('combobox', { name: 'Search jams' });
	await search.fill('gmtk');
	await page.waitForFunction(
		() => (window as typeof window & { searchStarted?: boolean }).searchStarted
	);
	await search.fill('');
	await page.evaluate(async () => {
		(window as typeof window & { releaseSearch?: () => void }).releaseSearch?.();
		// Let fetch, response parsing, and Svelte's render finish.
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
		);
	});
	await expect(search).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('listbox')).toHaveCount(0);
});
