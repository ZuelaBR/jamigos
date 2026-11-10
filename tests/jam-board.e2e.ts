import { expect, test } from '@playwright/test';
import { go, pick, runId, signInAndOnboard } from './helpers.ts';

test('jam board shows labeled people and recruiting teams together and filters each category', async ({
	browser,
	page: guest
}, info) => {
	const run = runId(info.project.name);
	const slug = info.project.name === 'mobile' ? 'poetry-jam' : 'rpg-latam-jam-2026';
	const owner = await signInAndOnboard(browser, `boss${run}`, 'Art', 'UTC');
	const person = await signInAndOnboard(browser, `coder${run}`, 'Programming', 'UTC');
	const viewer = await signInAndOnboard(browser, `guest${run}`, 'Writing', 'UTC');
	if (info.project.name === 'mobile') await viewer.setViewportSize({ width: 320, height: 800 });
	const name = `Puzzle Crew ${run}`;
	const personName = `Coder${run}`;

	await go(owner, `/jams/${slug}`);
	await owner.getByRole('button', { name: 'Start a team', exact: true }).click();
	await owner.getByLabel('Team name', { exact: true }).fill(name);
	for (const role of ['Programming', 'Art', 'Audio', 'Game design', 'Testing / QA', 'Producer']) {
		await pick(owner.getByRole('dialog'), 'checkbox', role);
	}
	await owner
		.getByLabel('Pitch', { exact: false })
		.fill('A relaxed team making a small co-op puzzle game.');
	await owner.getByRole('button', { name: 'Create team', exact: true }).click();
	await expect(owner).toHaveURL(/\/teams\//);
	const teamUrl = owner.url().split('?')[0];
	await go(person, `/jams/${slug}`);
	await person.getByRole('button', { name: /I'm looking for a team/ }).click();
	await person
		.getByLabel('Anything teams should know?')
		.fill('Godot programmer looking for a team.');
	await person.getByRole('button', { name: 'Post', exact: true }).click();
	await expect(person.getByText(/You're on the board/)).toBeVisible();

	await go(viewer, `/jams/${slug}`);
	const all = viewer.getByRole('tab', { name: /^All/ });
	const people = viewer.getByRole('tab', { name: /^People/ });
	const teams = viewer.getByRole('tab', { name: /^Teams/ });
	const personCard = viewer.getByRole('article', { name: `Person: ${personName}`, exact: true });
	const teamCard = viewer.getByRole('article', { name: `Team: ${name}`, exact: true });
	await expect(all).toHaveAttribute('aria-selected', 'true');
	await expect(personCard).toBeVisible();
	await expect(personCard.getByText('Person', { exact: true })).toBeVisible();
	await expect(personCard.getByRole('button', { name: 'Team up', exact: true })).toBeVisible();
	await expect(teamCard).toBeVisible();
	await expect(teamCard.getByText('Team', { exact: true })).toBeVisible();
	await expect(teamCard.getByText('Recruiting members', { exact: true })).toBeVisible();
	await expect(teamCard.getByRole('button', { name: 'Ask to join', exact: true })).toBeVisible();
	const personBounds = (await personCard.boundingBox())!;
	const teamBounds = (await teamCard.boundingBox())!;
	expect(Math.abs(personBounds.width - teamBounds.width)).toBeLessThanOrEqual(1);
	if (info.project.name === 'desktop') {
		expect(Math.abs(personBounds.y - teamBounds.y)).toBeLessThanOrEqual(1);
		expect(Math.abs(personBounds.height - teamBounds.height)).toBeLessThanOrEqual(1);
	}
	await expect(viewer.getByRole('combobox', { name: 'Filter by experience' })).toHaveCount(0);
	expect(
		await viewer.locator('main').evaluate(
			(main) =>
				Array.from(main.querySelectorAll('h2,article,button,select')).filter((element) => {
					const bounds = element.getBoundingClientRect();
					return bounds.width > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1);
				}).length
		)
	).toBe(0);
	await viewer.screenshot({ path: info.outputPath('jam-board-all.png'), fullPage: true });

	// Signed-out visitors get the same categories without private contact details.
	await go(guest, `/jams/${slug}`);
	await expect(
		guest.getByRole('article', { name: `Person: ${personName}`, exact: true })
	).toBeVisible();
	await expect(guest.getByRole('article', { name: `Team: ${name}`, exact: true })).toBeVisible();
	await expect(guest.locator('main')).not.toContainText(`coder${run}_dc`);

	await people.click();
	await expect(people).toHaveAttribute('aria-selected', 'true');
	await expect(personCard).toBeVisible();
	await expect(teamCard).toHaveCount(0);
	expect(
		Math.abs((await personCard.boundingBox())!.width - personBounds.width)
	).toBeLessThanOrEqual(1);
	await viewer.getByRole('combobox', { name: 'Filter by role' }).selectOption('code');
	await viewer.getByRole('combobox', { name: 'Filter by experience' }).selectOption('some');
	await viewer.getByRole('checkbox', { name: 'Good timezone overlap', exact: true }).check();
	await expect(personCard).toBeVisible();
	await teams.click();
	await expect(teams).toHaveAttribute('aria-selected', 'true');
	await expect(teamCard).toBeVisible();
	await expect(personCard).toHaveCount(0);
	expect(Math.abs((await teamCard.boundingBox())!.width - teamBounds.width)).toBeLessThanOrEqual(1);
	expect(new URL(viewer.url()).searchParams.get('role')).toBe('code');
	expect(new URL(viewer.url()).searchParams.has('exp')).toBe(false);
	expect(new URL(viewer.url()).searchParams.has('overlap')).toBe(false);
	await viewer.getByRole('checkbox', { name: 'Needs my skills', exact: true }).check();
	await expect(teamCard).toHaveCount(0); // viewer has Writing; this team needs other roles
	await all.click();
	await expect(personCard).toBeVisible();
	await expect(teamCard).toBeVisible();
	expect(new URL(viewer.url()).searchParams.has('fit')).toBe(false);
	await all.focus();
	await viewer.keyboard.press('ArrowRight');
	await expect(people).toHaveAttribute('aria-selected', 'true');
	await viewer.keyboard.press('End');
	await expect(teams).toHaveAttribute('aria-selected', 'true');
	await viewer.reload();
	await viewer.locator('html[data-hydrated]').waitFor();
	await expect(teams).toHaveAttribute('aria-selected', 'true');
	await expect(teamCard).toBeVisible();

	// Teams that stop recruiting disappear from every discovery category.
	await go(owner, teamUrl);
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await pick(owner.getByRole('dialog'), 'radio', 'Not recruiting');
	await owner.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
	await expect(owner.getByRole('dialog')).toBeHidden();
	await go(viewer, `/jams/${slug}`);
	await expect(personCard).toBeVisible();
	await expect(teamCard).toHaveCount(0);
	await teams.click();
	await expect(viewer.getByText('No teams are recruiting yet', { exact: true })).toBeVisible();
	await owner.context().close();
	await person.context().close();
	await viewer.context().close();
});
