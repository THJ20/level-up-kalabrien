import { describe, expect, it } from 'vitest';
import {
	CHALLENGE_END,
	addDays,
	isTrackedDay,
	isWarmupDay,
	challengeDayNumber,
	challengeDays,
	daysBetween,
	daysUntilDeparture,
	endOfDay,
	isLocalDate,
	localDateOf,
	minutesOfDay,
	startOfDay
} from './challenge';

describe('Kalender', () => {
	it('kennt Start, Ende und Länge der Challenge', () => {
		expect(challengeDayNumber('2026-10-12')).toBe(1);
		expect(challengeDayNumber(CHALLENGE_END)).toBe(199);
		expect(challengeDayNumber('2026-10-11')).toBeNull();
		expect(challengeDayNumber('2027-04-29')).toBeNull();
		const days = challengeDays();
		expect(days).toHaveLength(199);
		expect(days[0]).toBe('2026-10-12');
		expect(days[198]).toBe('2027-04-28');
	});

	it('hat drei Aufwärmtage vor dem Start', () => {
		expect(isWarmupDay('2026-10-08')).toBe(false);
		expect(isWarmupDay('2026-10-09')).toBe(true);
		expect(isWarmupDay('2026-10-11')).toBe(true);
		expect(isWarmupDay('2026-10-12')).toBe(false);
		expect(challengeDayNumber('2026-10-09')).toBeNull();
	});

	it('erlaubt Einträge an Aufwärm- und Challenge-Tagen', () => {
		expect(isTrackedDay('2026-10-08')).toBe(false);
		expect(isTrackedDay('2026-10-09')).toBe(true);
		expect(isTrackedDay('2027-04-28')).toBe(true);
		expect(isTrackedDay('2027-04-29')).toBe(false);
		expect(isTrackedDay('kein Datum')).toBe(false);
	});

	it('zählt die Tage bis zum Abflug', () => {
		expect(daysUntilDeparture('2026-10-12')).toBe(199);
		expect(daysUntilDeparture('2027-04-28')).toBe(1);
		expect(daysUntilDeparture('2027-05-01')).toBe(0);
	});

	it('rechnet über Monats- und Jahresgrenzen', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
		expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
	});

	it('prüft das Datumsformat', () => {
		expect(isLocalDate('2026-10-09')).toBe(true);
		expect(isLocalDate('2026-02-30')).toBe(false);
		expect(isLocalDate('09.10.2026')).toBe(false);
	});
});

describe('Zeitzone Europe/Berlin', () => {
	it('ordnet Zeitpunkte dem deutschen Kalendertag zu', () => {
		expect(localDateOf(new Date('2026-10-09T21:59:59Z'))).toBe('2026-10-09');
		expect(localDateOf(new Date('2026-10-09T22:00:00Z'))).toBe('2026-10-10');
		expect(localDateOf(new Date('2026-12-01T22:59:59Z'))).toBe('2026-12-01');
		expect(localDateOf(new Date('2026-12-01T23:00:00Z'))).toBe('2026-12-02');
	});

	it('liefert Mitternacht in Sommer- und Winterzeit', () => {
		expect(startOfDay('2026-10-10').toISOString()).toBe('2026-10-09T22:00:00.000Z');
		expect(startOfDay('2026-12-02').toISOString()).toBe('2026-12-01T23:00:00.000Z');
	});

	it('übersteht die Umstellung auf Winterzeit am 25.10.2026', () => {
		expect(startOfDay('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
		expect(endOfDay('2026-10-25').toISOString()).toBe('2026-10-25T23:00:00.000Z');
		expect(endOfDay('2026-10-25').getTime() - startOfDay('2026-10-25').getTime()).toBe(
			25 * 3_600_000
		);
	});

	it('übersteht die Umstellung auf Sommerzeit am 28.03.2027', () => {
		expect(startOfDay('2027-03-28').toISOString()).toBe('2027-03-27T23:00:00.000Z');
		expect(endOfDay('2027-03-28').toISOString()).toBe('2027-03-28T22:00:00.000Z');
		expect(endOfDay('2027-03-28').getTime() - startOfDay('2027-03-28').getTime()).toBe(
			23 * 3_600_000
		);
	});

	it('liefert die Uhrzeit in Minuten seit Mitternacht', () => {
		expect(minutesOfDay(new Date('2026-10-09T05:59:00Z'))).toBe(7 * 60 + 59);
		expect(minutesOfDay(new Date('2026-12-01T22:30:00Z'))).toBe(23 * 60 + 30);
	});
});
