import { expect, test, type Page } from '@playwright/test';
import { contextOptions, go, runId, signInAndOnboard } from './helpers.ts';

async function expectContentFits(page: Page) {
	// Checking scrollWidth alone misses content clipped by the page shell.
	const outside = await page.locator('main').evaluate((main) =>
		Array.from(main.querySelectorAll('h1,p,a,button,input,select,textarea'))
			.filter((element) => {
				const rect = element.getBoundingClientRect();
				return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
			})
			.map((element) => element.textContent?.trim().slice(0, 70))
	);
	expect(outside).toEqual([]);
}

test('signed-out navigation offers a clear sign-in path for adding jams', async ({ page }) => {
	await go(page, '/jams');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.locator('main')).toBeFocused();
	await page.getByRole('button', { name: /Jam not listed/ }).click();
	await expect(page.getByText('Sign in to add a jam by its itch.io link.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add jam', exact: true })).toHaveCount(0);
	await page.getByRole('contentinfo').getByRole('link', { name: 'Your data' }).click();
	await expect(page.locator('#data-storage')).toHaveAttribute('open', '');
});

test('browse search works without JavaScript and keeps timing and sorting', async ({ browser }) => {
	const context = await browser.newContext({ ...contextOptions(), javaScriptEnabled: false });
	const page = await context.newPage();
	await page.goto('/jams?tab=upcoming&sort=popular');
	await page.getByRole('searchbox', { name: 'Search jams' }).fill('gmtk');
	await page.getByRole('searchbox', { name: 'Search jams' }).press('Enter');
	await expect(page).toHaveURL(/tab=upcoming&sort=popular&q=gmtk/);
	await expect(page.getByRole('heading', { name: 'GMTK Game Jam 2027' })).toBeVisible();
	await context.close();
});

test('account and theme menus work with the keyboard and invalid fields receive focus', async ({
	browser
}, info) => {
	const page = await signInAndOnboard(browser, `keys${runId(info.project.name)}`, 'Art', 'UTC');
	expect(page.viewportSize()).toEqual(info.project.use.viewport);
	const account = page.getByRole('button', { name: 'Account menu' });
	await account.focus();
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitem', { name: 'My teams' })).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitem', { name: 'My profile' })).toBeFocused();
	await page.keyboard.press('End');
	await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(account).toBeFocused();
	await expect(account).toHaveAttribute('aria-expanded', 'false');

	const theme = page.getByRole('button', { name: /^Theme:/ });
	await theme.focus();
	await page.keyboard.press('ArrowDown');
	await expect(page.getByRole('menuitemradio', { name: 'Light' })).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(theme).toBeFocused();
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('menu', { name: 'Theme' })).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Inbox' })).toBeFocused();

	await go(page, '/settings');
	await expect(page.locator('.choice').first()).toHaveCSS('color', 'rgb(238, 238, 238)');
	await expect(page.locator('.choice').first()).toHaveCSS('background-color', 'rgb(17, 17, 17)');
	await expect(
		page
			.locator('.choice')
			.filter({ has: page.getByRole('checkbox', { name: 'Art', exact: true }) })
	).toHaveCSS('color', 'rgb(238, 238, 238)');
	await expect(page.getByLabel('Timezone')).toHaveValue('UTC');
	await page.getByLabel('Discord username').fill('not a valid username!');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByLabel('Discord username')).toHaveAttribute('aria-invalid', 'true');
	await expect(page.getByLabel('Discord username')).toBeFocused();
	await expect(page.getByText('That does not look like a Discord username.')).toBeVisible();
	await page.context().close();
});

test('long profiles and team names fit narrow screens and failed copy actions explain recovery', async ({
	browser
}, info) => {
	const page = await signInAndOnboard(browser, `wrap${runId(info.project.name)}`, 'Art', 'UTC');
	await go(page, '/settings');
	await page.getByLabel('Short bio').fill('a'.repeat(500));
	await page
		.getByRole('textbox', { name: 'Portfolio link 1' })
		.fill(`https://example.com/${'x'.repeat(170)}`);
	await page.getByLabel('Discord username').fill('discord_username_with_32_letters');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(page.getByText('Profile saved.', { exact: true })).toBeVisible();
	const profileHref = await page
		.getByRole('link', { name: 'View public profile' })
		.getAttribute('href');
	await go(page, profileHref!);
	if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 800 });
	await expectContentFits(page);

	const slug = info.project.name === 'mobile' ? 'pixel-forge-mega-jam' : 'ostcompjam';
	await go(page, `/jams/${slug}`);
	await page.getByRole('button', { name: 'Start a team', exact: true }).click();
	await page.getByLabel('Team name', { exact: true }).fill('A'.repeat(60));
	await page.getByRole('button', { name: 'Create team', exact: true }).click();
	await expect(page).toHaveURL(/\/teams\//);
	await expectContentFits(page);
	await page.evaluate(() =>
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: () => Promise.reject(new Error('Permission denied')) }
		})
	);
	await page.getByRole('button', { name: 'Share link' }).click();
	await expect(
		page.getByText('Copy didn’t work. Please select and copy the text manually.')
	).toBeVisible();
	await page.context().close();
});

test('contact dialogs stay on-screen, return focus and show copy feedback above the dialog', async ({
	browser
}, info) => {
	const run = runId(info.project.name);
	const author = await signInAndOnboard(browser, `poster${run}`, 'Art', 'UTC');
	const viewer = await signInAndOnboard(browser, `viewer${run}`, 'Programming', 'UTC');
	const slug = info.project.name === 'mobile' ? 'hand-crafted-jam' : '3x3x3-jam';
	await go(author, `/jams/${slug}`);
	await author.getByRole('button', { name: /I'm looking for a team/ }).click();
	await author.getByRole('button', { name: 'Post', exact: true }).click();
	await expect(author.getByText(/You're on the board/)).toBeVisible();
	await go(viewer, `/jams/${slug}`);
	if (info.project.name === 'mobile') await viewer.setViewportSize({ width: 320, height: 800 });
	const contact = viewer.getByRole('button', { name: 'Contact', exact: true });
	await contact.click();
	const dialog = viewer.getByRole('dialog', { name: /^How to contact/ });
	await expect(dialog).toBeVisible();
	// Ignore a native close event queued just before the same dialog reopens.
	await dialog.evaluate(
		(element) =>
			new Promise<void>((resolve) => {
				element.addEventListener('close', () => setTimeout(resolve, 0), { once: true });
				(element as HTMLDialogElement).close();
				(element as HTMLDialogElement).showModal();
			})
	);
	await expect(dialog).toBeVisible();
	const bounds = await dialog.boundingBox();
	expect(bounds!.x).toBeGreaterThanOrEqual(0);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewer.viewportSize()!.width);
	await viewer.evaluate(() =>
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: () => Promise.reject(new Error('Permission denied')) }
		})
	);
	await dialog.getByRole('button', { name: 'Copy', exact: true }).click();
	const feedback = viewer.getByText('Copy didn’t work. Please select and copy the text manually.');
	await expect(feedback).toBeVisible();
	// A normal fixed toast would be trapped behind the dialog's top layer.
	await expect
		.poll(async () => {
			const bounds = await feedback.boundingBox();
			return viewer.evaluate(
				({ x, y }) => document.elementFromPoint(x, y)?.textContent?.includes('Copy didn’t work'),
				{
					x: bounds!.x + bounds!.width / 2,
					y: bounds!.y + bounds!.height / 2
				}
			);
		})
		.toBe(true);
	await viewer.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(contact).toBeFocused();
	await author.context().close();
	await viewer.context().close();
});

test('timezone overlap help explains the estimate on hover, focus and tap without changing the filter', async ({
	browser
}, info) => {
	const page = await signInAndOnboard(browser, `tz${runId(info.project.name)}`, 'Art', 'UTC');
	await go(page, `/jams/${info.project.metadata.jam}?tab=players`);
	if (info.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 800 });
	const help = page.getByRole('button', { name: 'About good timezone overlap', exact: true });
	const filter = page.getByRole('checkbox', { name: 'Good timezone overlap', exact: true });
	const definition = page.getByRole('tooltip');
	if (info.project.name === 'mobile') await help.click();
	else await page.getByText('Good timezone overlap', { exact: true }).hover();
	await expect(definition).toBeVisible();
	await expect(definition).toContainText('roughly 5 or more waking hours');
	await expect(definition).toContainText('9am to midnight');
	await expect(filter).not.toBeChecked();
	const bounds = await definition.boundingBox();
	expect(bounds!.x).toBeGreaterThanOrEqual(0);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
	await page.keyboard.press('Escape');
	await expect(definition).toBeHidden();
	await page.getByRole('combobox', { name: 'Filter by role' }).focus();
	await help.focus();
	await expect(definition).toBeVisible();
	await expect(filter).not.toBeChecked();
	await page.context().close();
});

test('owners can invite, transfer ownership, and leave through clear confirmations', async ({
	browser
}, info) => {
	const run = runId(info.project.name);
	const owner = await signInAndOnboard(browser, `captain${run}`, 'Art', 'UTC');
	const member = await signInAndOnboard(browser, `invitee${run}`, 'Programming', 'UTC');
	const slug = info.project.name === 'mobile' ? 'the-eye-jam3' : '4-page-comic-jam-2027';
	const teamName = `Crew ${run}`;
	await go(owner, `/jams/${slug}`);
	await owner.getByRole('button', { name: 'Start a team', exact: true }).click();
	await owner.getByLabel('Team name', { exact: true }).fill(teamName);
	await owner.getByRole('button', { name: 'Create team', exact: true }).click();
	await expect(owner).toHaveURL(/\/teams\//);
	const teamUrl = owner.url().split('?')[0];

	await go(member, `/jams/${slug}?tab=players`);
	await member.getByRole('button', { name: /I'm looking for a team/ }).click();
	await member.getByRole('button', { name: 'Post', exact: true }).click();
	await expect(member.getByText(/You're on the board/)).toBeVisible();
	await expect(member.getByText('You’re the only one looking so far')).toBeVisible();
	await go(owner, `/jams/${slug}`);
	await owner.getByRole('button', { name: `Invite to ${teamName}` }).click();
	await owner
		.getByRole('dialog')
		.getByLabel('Message', { exact: false })
		.fill('Let’s make a game together.');
	await owner.getByRole('button', { name: 'Send invite', exact: true }).click();
	await expect(owner.getByText('Invite sent!', { exact: true })).toBeVisible();
	await go(member, '/inbox');
	await expect(member.getByText('Let’s make a game together.')).toBeVisible();
	await member.getByRole('button', { name: 'Accept', exact: true }).click();
	await expect(member.getByText(/Welcome to/)).toBeVisible();
	await go(owner, '/inbox');
	await expect(
		owner.getByRole('listitem').filter({ hasText: 'accepted your invite' })
	).toContainText(teamName);

	await go(owner, teamUrl);
	await owner.getByRole('button', { name: 'Make owner', exact: true }).click();
	const transfer = owner.getByRole('dialog', { name: /the owner\?/ });
	await expect(transfer.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
	await transfer.getByRole('button', { name: 'Make owner', exact: true }).click();
	await expect(owner.getByText('Ownership transferred.', { exact: true })).toBeVisible();
	await expect(owner.getByRole('button', { name: 'Edit team', exact: true })).toHaveCount(0);
	await go(member, teamUrl);
	await expect(member.getByRole('button', { name: 'Edit team', exact: true })).toBeVisible();
	await owner.getByRole('button', { name: 'Leave team…', exact: true }).click();
	await owner.getByRole('dialog').getByRole('button', { name: 'Leave team', exact: true }).click();
	await expect(owner).toHaveURL(new RegExp(`/jams/${slug}`));
	await expect(owner.getByText('You left the team.', { exact: true })).toBeVisible();
	await owner.context().close();
	await member.context().close();
});
