import { describe, expect, it } from 'vitest';
import { parsePage } from './pagination.ts';

describe('page query validation', () => {
	it.each([
		null,
		'',
		'0',
		'-1',
		'1.5',
		'Infinity',
		'-Infinity',
		'NaN',
		'abc',
		'1e100',
		'10001',
		'9007199254740992'
	])('uses the first page for invalid or excessive input %s', (input) => {
		expect(parsePage(input)).toBe(1);
	});
	it.each(['1', '2', '10000'])('keeps valid page %s', (input) => {
		expect(parsePage(input)).toBe(Number(input));
	});
});
