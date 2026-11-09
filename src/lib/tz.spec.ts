import { describe, expect, it } from 'vitest';
import { formatOffset, isValidTimeZone, offsetMinutes, overlapHours } from './tz';

describe('offsetMinutes', () => {
	it('handles DST-aware zones', () => {
		expect(offsetMinutes('Europe/Rome', new Date('2026-07-01T12:00:00Z'))).toBe(120);
		expect(offsetMinutes('Europe/Rome', new Date('2026-01-15T12:00:00Z'))).toBe(60);
		expect(offsetMinutes('America/Los_Angeles', new Date('2026-01-15T12:00:00Z'))).toBe(-480);
		expect(offsetMinutes('Asia/Kolkata', new Date('2026-01-15T12:00:00Z'))).toBe(330);
		expect(offsetMinutes('UTC')).toBe(0);
	});
});

describe('formatOffset', () => {
	it('formats hours and half hours', () => {
		expect(formatOffset(120)).toBe('UTC+2');
		expect(formatOffset(-480)).toBe('UTC−8');
		expect(formatOffset(330)).toBe('UTC+5:30');
	});
});

describe('overlapHours', () => {
	it('is 15h for the same timezone (09–24 window)', () => {
		expect(overlapHours(60, 60)).toBe(15);
	});
	it('shrinks with distance and is symmetric', () => {
		expect(overlapHours(0, 6 * 60)).toBe(9);
		expect(overlapHours(6 * 60, 0)).toBe(9);
	});
	it('wraps around the date line', () => {
		// UTC−10 and UTC+12 are 22h apart, i.e. effectively 2h apart.
		expect(overlapHours(-600, 720)).toBe(13);
	});
	it('handles opposite sides of the world', () => {
		expect(overlapHours(0, 12 * 60)).toBe(6); // 3h each side of the circle
	});
});

describe('isValidTimeZone', () => {
	it('validates IANA names', () => {
		expect(isValidTimeZone('Europe/Rome')).toBe(true);
		expect(isValidTimeZone('Mars/Olympus')).toBe(false);
	});
});
