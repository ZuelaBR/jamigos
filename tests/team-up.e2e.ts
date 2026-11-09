import { expect, test } from '@playwright/test';
import { go, runId, signInAndOnboard } from './helpers.ts';

test('two solo jammers team up and become a team', async ({ browser }, testInfo) => {
	const run = runId(testInfo.project.name);
	// A real itch.io jam, loaded into the test database by global-setup.ts.
	const slug = testInfo.project.metadata.teamUpJam as string;
	const mika = await signInAndOnboard(browser, `mika${run}`, 'Art', 'Europe/Berlin');
	const lucia = await signInAndOnboard(browser, `lucia${run}`, 'Writing', 'Europe/Madrid');
	const [Mika, Lucia] = [`Mika${run}`, `Lucia${run}`];

	// Both post that they're looking for a team.
	for (const page of [mika, lucia]) {
		await go(page, `/jams/${slug}`);
		await page.getByRole('button', { name: /I'm looking for a team/ }).click();
		await page.getByRole('button', { name: 'Post', exact: true }).click();
		await expect(page.getByText(/You're on the board/)).toBeVisible();
	}

	// Mika finds Lucia: Contact shows her Discord, then Mika asks to team up.
	await go(mika, `/jams/${slug}?tab=players`);
	const card = mika.locator('article', { hasText: Lucia });
	await card.getByRole('button', { name: 'Contact' }).click();
	await expect(mika.getByRole('dialog', { name: `How to contact ${Lucia}` })).toContainText(
		`lucia${run}_dc`
	);
	await mika.keyboard.press('Escape');
	await card.getByRole('button', { name: 'Team up' }).click();
	const modal = mika.getByRole('dialog', { name: `Team up with ${Lucia}` });
	await expect(modal).toContainText(`${Mika} & ${Lucia}`); // the default team name
	await modal.getByLabel(/Message/).fill('Want to make something cozy?');
	await modal.getByRole('button', { name: 'Send request' }).click();
	await expect(mika.getByText(/Request sent/)).toBeVisible();
	await expect(card.getByRole('button', { name: /Team-up sent/ })).toBeVisible();

	// Lucia sees the request (inbox badge + board banner) and accepts.
	await go(lucia, `/jams/${slug}`);
	await expect(lucia.getByRole('link', { name: /Inbox, 1 pending/ })).toBeVisible();
	await expect(lucia.getByText('Want to make something cozy?')).toBeVisible();
	await lucia.getByRole('button', { name: 'Team up', exact: true }).click();
	await expect(lucia).toHaveURL(/\/teams\/.+\?teamup=1/);
	await expect(lucia.getByText("You're a team!")).toBeVisible();
	await expect(lucia.getByRole('heading', { level: 1, name: `${Mika} & ${Lucia}` })).toBeVisible();
	const teamUrl = lucia.url().split('?')[0];

	// Mika (the sender) owns the team and renames it.
	await go(mika, `/jams/${slug}`);
	await expect(mika.getByText(/You're on/)).toBeVisible();
	await expect(mika.getByText('Nobody is looking yet')).toBeVisible(); // both posts closed
	await go(mika, teamUrl);
	await mika.getByRole('button', { name: 'Edit team' }).click();
	await mika.getByLabel('Team name').fill('Cozy Crew');
	await mika.getByRole('button', { name: 'Save' }).click();
	await expect(mika.getByRole('heading', { level: 1, name: 'Cozy Crew' })).toBeVisible();
	await expect(mika.getByRole('button', { name: `Discord: lucia${run}_dc` })).toBeVisible();
});

test('signed-out visitors are asked to sign in before seeing contact details', async ({
	page
}, testInfo) => {
	const slug = testInfo.project.metadata.jam as string;
	await go(page, `/jams/${slug}`);
	const contact = page.getByRole('link', { name: 'Contact' }).first();
	if (await contact.count()) {
		await expect(contact).toHaveAttribute('href', /^\/login\?next=/);
	}
	// No Discord usernames are sent to signed-out visitors at all.
	expect(await page.content()).not.toMatch(/_dc"/);
});
