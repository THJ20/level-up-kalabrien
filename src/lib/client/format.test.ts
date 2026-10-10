import { describe, expect, it } from 'vitest';
import { countdown, dayLabel, longDayLabel, points, relativeTime } from './format';

describe('Datums-Labels', () => {
	it('zeigt Wochentag und Datum kurz und lang', () => {
		expect(dayLabel('2026-10-12')).toBe('Mo, 12.10.');
		expect(dayLabel('2027-04-29')).toBe('Do, 29.04.');
		expect(longDayLabel('2026-10-12')).toBe('Montag, 12. Oktober 2026');
	});
});

describe('Relative Zeit', () => {
	const now = new Date('2026-10-12T12:00:00Z');
	it.each([
		['2026-10-12T11:59:40Z', 'gerade eben'],
		['2026-10-12T11:55:00Z', 'vor 5 Min.'],
		['2026-10-12T09:00:00Z', 'vor 3 Std.'],
		['2026-10-11T12:00:00Z', 'gestern'],
		['2026-10-08T12:00:00Z', 'Do, 08.10.']
	])('%s ist %s', (iso, label) => {
		expect(relativeTime(new Date(iso), now)).toBe(label);
	});
});

describe('Zahlen und Countdown', () => {
	it('rundet Punkte und formatiert Tausender', () => {
		expect(points(17.5)).toBe('18');
		expect(points(12345)).toBe('12.345');
	});

	it('zeigt die Restzeit bis Mitternacht', () => {
		expect(countdown(3_723_000)).toBe('01:02:03');
		expect(countdown(-5)).toBe('00:00:00');
	});
});
