import { expect, test, type Page } from '@playwright/test';
import { go, pick, runId, signInAndOnboard } from './helpers.ts';

async function createTeam(page: Page, slug: string, name: string, pitch = '') {
	await go(page, `/jams/${slug}`);
	await page.getByRole('button', { name: 'Start a team', exact: true }).click();
	await page.getByLabel('Team name', { exact: true }).fill(name);
	if (pitch) {
		await page.getByLabel('Pitch', { exact: false }).fill(pitch);
		for (const role of ['Programming', 'Art', 'Writing']) {
			await pick(page.getByRole('dialog'), 'checkbox', role);
		}
	}
	await page.getByRole('button', { name: 'Create team', exact: true }).click();
	await expect(page).toHaveURL(/\/teams\//);
	return page.url().split('?')[0];
}

test('My teams is available from home and the menu and includes owned and joined teams', async ({
	browser
}, info) => {
	const run = runId(info.project.name);
	const owner = await signInAndOnboard(browser, `lead${run}`, 'Art', 'UTC');
	const member = await signInAndOnboard(browser, `mate${run}`, 'Programming', 'UTC');
	await go(member, '/');
	await member.getByRole('link', { name: 'My teams', exact: true }).click();
	await expect(member).toHaveURL(/\/teams$/);
	await expect(member.getByText('You haven’t joined a team yet')).toBeVisible();
	const slugs =
		info.project.name === 'mobile'
			? ['winter-vn-jam-2026', 'comfy-jam-winter-2027', 'procjam']
			: ['game-writing-sig-arcjam-2026', 'finishyourgamejam2026', 'month-of-horror-3'];
	const sharedName = `Shared ${run}`;
	const myName = `Mine ${run}`;
	const unrelatedName = `Other ${run}`;
	const sharedUrl = await createTeam(
		owner,
		slugs[0],
		sharedName,
		'A relaxed team making a story-driven puzzle game. Looking for people who enjoy experimenting together.'
	);
	await createTeam(owner, slugs[2], unrelatedName);
	await createTeam(member, slugs[1], myName);

	await go(member, sharedUrl);
	await member.getByRole('button', { name: 'Ask to join', exact: true }).click();
	await member.getByRole('button', { name: 'Send request', exact: true }).click();
	await expect(member.getByText('Request sent!', { exact: true })).toBeVisible();
	await go(owner, '/inbox');
	await owner.getByRole('button', { name: 'Accept', exact: true }).click();
	await expect(owner.getByText(/Welcome to/)).toBeVisible();

	await go(member, '/');
	await member.getByRole('button', { name: 'Account menu' }).click();
	await member.getByRole('menuitem', { name: 'My teams', exact: true }).click();
	await expect(member).toHaveURL(/\/teams$/);
	await expect(member.getByRole('link', { name: myName, exact: true })).toBeVisible();
	await expect(member.getByRole('link', { name: sharedName, exact: true })).toBeVisible();
	await expect(member.getByRole('link', { name: unrelatedName, exact: true })).toHaveCount(0);
	await expect(member.getByText('You own this team', { exact: true })).toBeVisible();
	await expect(member.getByText('Member', { exact: true })).toBeVisible();
	await expect(member.getByRole('link', { name: 'Manage team', exact: true })).toHaveCount(1);
	if (info.project.name === 'desktop') {
		const ownCard = member.getByRole('article').filter({ hasText: myName });
		const joinedCard = member.getByRole('article').filter({ hasText: sharedName });
		const own = (await ownCard.boundingBox())!;
		const joined = (await joinedCard.boundingBox())!;
		for (const dimension of ['width', 'height', 'y'] as const) {
			expect(Math.abs(own[dimension] - joined[dimension])).toBeLessThanOrEqual(1);
		}
		const ownActions = (await ownCard.locator('footer').boundingBox())!;
		const joinedActions = (await joinedCard.locator('footer').boundingBox())!;
		expect(Math.abs(ownActions.y - joinedActions.y)).toBeLessThanOrEqual(1);
	}
	await member.screenshot({ path: info.outputPath('my-teams.png'), fullPage: true });
	await member.getByRole('link', { name: 'View team', exact: true }).click();
	await expect(member).toHaveURL(sharedUrl);
	await member.getByRole('button', { name: 'Leave team…', exact: true }).click();
	await expect(member.getByRole('dialog')).toBeVisible();
	await member.getByRole('dialog').getByRole('button', { name: 'Leave team', exact: true }).click();
	await expect(member).toHaveURL(new RegExp(`/jams/${slugs[0]}`));
	await go(member, '/teams');
	await expect(member.getByRole('link', { name: sharedName, exact: true })).toHaveCount(0);
	await expect(member.getByRole('link', { name: myName, exact: true })).toBeVisible();
	await owner.context().close();
	await member.context().close();
});

test('My teams requires sign-in', async ({ page }) => {
	const response = await page.request.get('/teams', { maxRedirects: 0 });
	expect(response.status()).toBe(303);
	expect(response.headers().location).toBe('/login?next=%2Fteams');
});
