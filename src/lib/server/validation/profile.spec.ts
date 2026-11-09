import { describe, expect, it } from 'vitest';
import { parseProfileForm } from './profile';

function form(entries: [string, string][]) {
	const fd = new FormData();
	for (const [k, v] of entries) fd.append(k, v);
	return fd;
}

const base: [string, string][] = [
	['roles', 'code'],
	['experience', 'some'],
	['timezone', 'Europe/Rome']
];

describe('parseProfileForm', () => {
	it('accepts a minimal profile and normalises fields', () => {
		const r = parseProfileForm(
			form([
				...base,
				['roles', 'code'],
				['tools', 'Godot'],
				['tools', 'godot'],
				['contactDiscord', '@ale_dev']
			])
		);
		expect(r.success).toBe(true);
		expect(r.data?.roles).toEqual(['code']);
		expect(r.data?.tools).toEqual(['godot']);
		expect(r.data?.contactDiscord).toBe('ale_dev');
		expect(r.data?.contactEmail).toBeNull();
	});

	it('requires a role and a valid timezone', () => {
		const r = parseProfileForm(
			form([
				['experience', 'some'],
				['timezone', 'Nowhere/Land']
			])
		);
		expect(r.success).toBe(false);
		const paths = r.error!.issues.map((i) => i.path[0]);
		expect(paths).toContain('roles');
		expect(paths).toContain('timezone');
	});

	it('rejects unknown roles and non-http links', () => {
		const r = parseProfileForm(
			form([...base, ['roles', 'wizard'], ['links', 'javascript:alert(1)']])
		);
		expect(r.success).toBe(false);
	});
});
