import { expect, test } from '@playwright/test';
import { go, pick, signInAndOnboard } from './helpers.ts';

test('two jammers find each other and form a team', async ({ browser }, testInfo) => {
	// Unique per project + run: desktop and mobile execute in parallel against the same database.
	const run = `${testInfo.project.name.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	// A real itch.io jam, loaded into the test database by global-setup.ts.
	const slug = testInfo.project.metadata.jam as string;

	const alice = await signInAndOnboard(browser, `alice${run}`, 'Art', 'Europe/Rome');
	const bob = await signInAndOnboard(browser, `bob${run}`, 'Programming', 'America/New_York');

	// Bob posts that he's looking for a team.
	await go(bob, `/jams/${slug}`);
	// The itch.io link is a button on desktop and an inline link on mobile.
	await expect(bob.locator(`a[href="https://itch.io/jam/${slug}"]:visible`)).toHaveCount(1);
	await bob.getByRole('button', { name: /I'm looking for a team/ }).click();
	await bob.getByLabel('Anything teams should know?').fill('Godot dev, free all weekend');
	await bob.getByRole('button', { name: 'Post', exact: true }).click();
	await expect(bob.getByText(/You're on the board/)).toBeVisible();
	await expect(bob.getByText(/listed as/)).toBeVisible();

	// Alice starts a team. She sees Bob in the list.
	await go(alice, `/jams/${slug}`);
	await expect(alice.getByText('Godot dev, free all weekend')).toBeVisible();
	await alice.getByRole('button', { name: 'Start a team' }).click();
	await alice.getByLabel('Team name').fill('Night Owls');
	await pick(alice.getByRole('dialog'), 'checkbox', 'Programming');
	await alice.getByRole('button', { name: 'Create team' }).click();
	await expect(alice).toHaveURL(/\/teams\/.+\?created=1/);
	await expect(alice.getByText('Team created!')).toBeVisible();
	const teamUrl = alice.url().split('?')[0];

	// Bob sees the team (highlighted because it needs Programming) and asks to join.
	await go(bob, `/jams/${slug}?tab=teams`);
	await expect(bob.getByText('Night Owls')).toBeVisible();
	await expect(bob.getByText('Needs programming')).toBeVisible();
	await bob.getByRole('button', { name: 'Ask to join' }).click();
	await bob.getByLabel(/Say hi/).fill('Hi! I can do the code.');
	await bob.getByRole('button', { name: 'Send request' }).click();
	await expect(bob.getByText(/Request sent/)).toBeVisible();
	await expect(bob.getByRole('button', { name: /Requested/ })).toBeVisible();

	// Alice gets an inbox badge and accepts from the inbox.
	await go(alice, '/inbox');
	await expect(alice.getByRole('link', { name: /Inbox, 1 pending/ })).toBeVisible();
	await expect(alice.getByText('Hi! I can do the code.')).toBeVisible();
	await alice.getByRole('button', { name: 'Accept' }).click();
	await expect(alice.getByText(/Welcome to Night Owls/)).toBeVisible();
	await expect(alice.getByText("You're all caught up")).toBeVisible();

	// Bob is now a member, his LFG post is gone, and he can see Alice's contact.
	await go(bob, teamUrl);
	await expect(bob.getByRole('button', { name: 'Leave team' })).toBeVisible();
	await expect(bob.getByRole('button', { name: `Discord: alice${run}_dc` })).toBeVisible();
	await go(bob, `/jams/${slug}`);
	await expect(bob.getByText(/You're on/)).toBeVisible();
	await bob.getByRole('tab', { name: /^People/ }).click();
	await expect(bob.getByText('Nobody is looking yet')).toBeVisible();
});

test('signed-out visitors can browse and are offered sign-in', async ({ page }) => {
	await page.goto('/jams');
	await expect(page.getByRole('heading', { name: 'Find a jam' })).toBeVisible();
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Sign in with itch.io' }).first()).toBeVisible();
});
