import { expect, test } from '@playwright/test';

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
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/');
	await page.getByRole('combobox', { name: 'Search jams' }).fill('brackeys');
	await page.getByRole('combobox', { name: 'Search jams' }).press('Enter');
	await expect(page).toHaveURL(/\/jams\?q=brackeys/);
	await expect(page.getByText('Brackeys Game Jam 2027.1')).toBeVisible();
	await context.close();
});
