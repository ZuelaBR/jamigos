import { expect, test } from '@playwright/test';

test('theme choice applies instantly and is server-rendered on reload', async ({ page }) => {
	await page.goto('/jams');
	await page.locator('html[data-hydrated]').waitFor();
	const html = page.locator('html');
	await expect(html).toHaveAttribute('data-theme', ''); // follows the OS by default

	await page.getByRole('button', { name: /^Theme:/ }).click();
	await page.getByRole('menuitemradio', { name: 'Dark' }).click();
	await expect(html).toHaveAttribute('data-theme', 'dark');
	await expect(html).toHaveCSS('background-color', 'rgb(17, 17, 17)');

	// The server reads the cookie, so the first paint is already dark (no flash).
	const res = await page.request.get('/jams');
	expect(await res.text()).toContain('data-theme="dark"');

	await page.reload();
	await expect(html).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: /^Theme:/ }).click();
	await page.getByRole('menuitemradio', { name: 'Light' }).click();
	await expect(html).toHaveCSS('background-color', 'rgb(255, 255, 255)');

	await page.getByRole('button', { name: /^Theme:/ }).click();
	await page.getByRole('menuitemradio', { name: 'System' }).click();
	await expect(html).toHaveAttribute('data-theme', '');
});
