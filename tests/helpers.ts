import { expect, type Browser, type Locator, type Page } from '@playwright/test';

/** Navigate and wait for hydration so clicks aren't lost before JS takes over. */
export async function go(page: Page, url: string) {
	await page.goto(url);
	await page.locator('html[data-hydrated]').waitFor();
}

/** Role/experience pickers use visually-hidden inputs inside styled labels; click the label like a user. */
export async function pick(scope: Page | Locator, role: 'checkbox' | 'radio', name: string) {
	const page = 'page' in scope ? scope.page() : scope;
	// `has` is evaluated relative to each label, so build it from the page, not the scope.
	await scope
		.locator('label')
		.filter({ has: page.getByRole(role, { name, exact: true }) })
		.click();
	await expect(scope.getByRole(role, { name, exact: true })).toBeChecked();
}

export async function signInAndOnboard(
	browser: Browser,
	username: string,
	role: string,
	tz: string
) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await go(page, `/auth/dev?user=${username}&next=/jams`);
	await expect(page).toHaveURL(/\/onboarding/);
	await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();

	// Step 1: roles + experience
	await pick(page, 'checkbox', role);
	await pick(page, 'radio', 'A few jams');
	await page.getByRole('button', { name: 'Continue' }).click();
	// Step 2: tools + timezone
	await page.getByRole('button', { name: '+ Godot' }).click();
	await page.getByLabel('Timezone').selectOption(tz);
	await page.getByRole('button', { name: 'Continue' }).click();
	// Step 3: contact
	await page.getByLabel('Discord username').fill(`${username}_dc`);
	await page.getByRole('button', { name: /Finish/ }).click();
	await expect(page).toHaveURL(/\/jams$/);
	return page;
}

/** A short unique suffix so parallel projects and repeated runs never collide. */
export function runId(projectName: string) {
	return `${projectName.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
