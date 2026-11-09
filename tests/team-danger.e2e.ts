import { expect, test } from '@playwright/test';
import { go, pick, runId, signInAndOnboard } from './helpers.ts';

test('leaving and disbanding a team need deliberate confirmation', async ({
	browser,
	baseURL
}, testInfo) => {
	const run = runId(testInfo.project.name);
	const slug = testInfo.project.metadata.dangerJam as string;
	const teamName = `Danger ${run}`;
	const owner = await signInAndOnboard(browser, `owner${run}`, 'Art', 'Europe/Rome');
	const member = await signInAndOnboard(browser, `member${run}`, 'Programming', 'Europe/Rome');

	// Owner starts a team, member asks to join, owner accepts.
	await go(owner, `/jams/${slug}`);
	await owner.getByRole('button', { name: 'Start a team' }).click();
	await owner.getByLabel('Team name').fill(teamName);
	await pick(owner.getByRole('dialog', { name: 'Start a team' }), 'checkbox', 'Programming');
	await owner.getByRole('button', { name: 'Create team' }).click();
	await expect(owner).toHaveURL(/\/teams\/.+\?created=1/);
	const teamUrl = owner.url().split('?')[0];
	await go(member, teamUrl);
	await member.getByRole('button', { name: 'Ask to join' }).click();
	await member.getByRole('button', { name: 'Send request' }).click();
	await expect(member.getByText(/Request sent/)).toBeVisible();
	await go(owner, '/inbox');
	await owner.getByRole('button', { name: 'Accept' }).click();
	await expect(owner.getByText(/Welcome to/)).toBeVisible();

	// The owner can't walk away from teammates: leaving is disabled until ownership moves.
	await go(owner, teamUrl);
	const danger = owner.getByLabel('Danger zone');
	await expect(danger.getByRole('button', { name: 'Leave team…' })).toBeDisabled();

	// Removing a member asks first; Cancel has focus, so Enter is safe.
	await owner.getByRole('button', { name: 'Remove', exact: true }).click();
	const removeDialog = owner.getByRole('dialog', { name: `Remove Member${run}?` });
	await expect(removeDialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
	await owner.keyboard.press('Enter');
	await expect(removeDialog).toBeHidden();
	await expect(owner.getByRole('link', { name: `Member${run}`, exact: true })).toBeVisible(); // still on the team

	// The member leaves, but only after confirming; Escape backs out.
	await go(member, teamUrl);
	await member.getByRole('button', { name: 'Leave team…' }).click();
	const leaveDialog = member.getByRole('dialog', { name: `Leave ${teamName}?` });
	await expect(leaveDialog).toBeVisible();
	await member.keyboard.press('Escape');
	await expect(leaveDialog).toBeHidden();
	await member.getByRole('button', { name: 'Leave team…' }).click();
	await leaveDialog.getByRole('button', { name: 'Leave team' }).click();
	await expect(member).toHaveURL(new RegExp(`/jams/${slug}$`));
	await expect(member.getByText('You left the team.')).toBeVisible();

	// The server refuses to disband without the typed team name, even for a crafted request.
	const res = await owner.request.post(`${teamUrl}?/disband`, {
		form: { confirm: 'wrong' },
		headers: { origin: baseURL!, accept: 'application/json' }
	});
	expect(await res.text()).toContain('Type the team name exactly to confirm');

	// Disbanding: the button only unlocks with the exact team name.
	await go(owner, teamUrl);
	await expect(owner.getByRole('link', { name: `Member${run}`, exact: true })).toHaveCount(0); // they left
	await owner.getByRole('button', { name: 'Disband team…' }).click();
	const disbandDialog = owner.getByRole('dialog', { name: `Disband ${teamName}?` });
	const disband = disbandDialog.getByRole('button', { name: 'Disband team' });
	await expect(disband).toBeDisabled();
	await disbandDialog.getByLabel(/Type .* to confirm/).fill(teamName.toLowerCase());
	await expect(disband).toBeDisabled();
	await disbandDialog.getByLabel(/Type .* to confirm/).fill(teamName);
	await expect(disband).toBeEnabled();
	await disband.click();
	await expect(owner).toHaveURL(new RegExp(`/jams/${slug}$`));
	await expect(owner.getByText('Team disbanded.')).toBeVisible();
	const gone = await owner.goto(teamUrl);
	expect(gone?.status()).toBe(404);
});
