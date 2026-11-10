import { expect, test } from '@playwright/test';
import { go, pick, runId, signInAndOnboard } from './helpers.ts';

test('reopening the team editor preserves details after status-only edits', async ({
	browser
}, info) => {
	const owner = await signInAndOnboard(browser, `editor${runId(info.project.name)}`, 'Art', 'UTC');
	const slug = info.project.name === 'mobile' ? 'godot-wild-jam-100' : 'gbjam-15';
	const name = 'Weekend Crew';
	const pitch = 'A small puzzle game with hand-drawn art.';
	await go(owner, `/jams/${slug}`);
	await owner.getByRole('button', { name: 'Start a team', exact: true }).click();
	await owner.getByLabel('Team name', { exact: true }).fill(name);
	await owner.getByLabel('Pitch', { exact: false }).fill(pitch);
	await pick(owner.getByRole('dialog'), 'checkbox', 'Programming');
	await owner.getByRole('button', { name: 'Create team', exact: true }).click();
	await expect(owner).toHaveURL(/\/teams\//);

	const editor = owner.getByRole('dialog', { name: 'Edit team', exact: true });
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await pick(editor, 'radio', 'Not recruiting');
	await editor.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(editor).toBeHidden();
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await expect(editor.getByLabel('Team name', { exact: true })).toHaveValue(name);
	await expect(editor.getByLabel('Pitch', { exact: true })).toHaveValue(pitch);
	await expect(editor.getByRole('checkbox', { name: 'Programming', exact: true })).toBeChecked();
	await expect(editor.getByRole('radio', { name: 'Not recruiting', exact: true })).toBeChecked();

	// Repeated status changes must not send empty name/pitch fields back to the server.
	await pick(editor, 'radio', 'Recruiting');
	await editor.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(editor).toBeHidden();
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await expect(editor.getByLabel('Team name', { exact: true })).toHaveValue(name);
	await expect(editor.getByLabel('Pitch', { exact: true })).toHaveValue(pitch);
	await expect(editor.getByRole('radio', { name: 'Recruiting', exact: true })).toBeChecked();

	// Cancelled drafts must not become the initial values of the next edit.
	await editor.getByLabel('Team name', { exact: true }).fill('Unsaved name');
	await editor.getByLabel('Pitch', { exact: true }).fill('Unsaved pitch');
	await pick(editor, 'checkbox', 'Audio');
	await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await expect(editor.getByLabel('Team name', { exact: true })).toHaveValue(name);
	await expect(editor.getByLabel('Pitch', { exact: true })).toHaveValue(pitch);
	await expect(editor.getByRole('checkbox', { name: 'Audio', exact: true })).not.toBeChecked();
	await expect(editor.getByRole('checkbox', { name: 'Programming', exact: true })).toBeChecked();

	// Saving a role change alone must leave the untouched text fields intact too.
	await pick(editor, 'checkbox', 'Audio');
	await editor.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(editor).toBeHidden();
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await expect(editor.getByLabel('Team name', { exact: true })).toHaveValue(name);
	await expect(editor.getByLabel('Pitch', { exact: true })).toHaveValue(pitch);
	await expect(editor.getByRole('checkbox', { name: 'Audio', exact: true })).toBeChecked();
	await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
	await owner.reload();
	await owner.locator('html[data-hydrated]').waitFor();
	await owner.getByRole('button', { name: 'Edit team', exact: true }).click();
	await expect(editor.getByLabel('Team name', { exact: true })).toHaveValue(name);
	await expect(editor.getByLabel('Pitch', { exact: true })).toHaveValue(pitch);
	await expect(editor.getByRole('checkbox', { name: 'Audio', exact: true })).toBeChecked();
	await owner.context().close();
});
