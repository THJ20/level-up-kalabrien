import { describe, expect, it } from 'vitest';
import type { DayStatus } from '#lib/domain/index.ts';
import { isoWeek, kpis, rangeFor, series, type StatsDay } from './stats';

function day(date: string, pushups: number, status: DayStatus = 'fulfilled', bonus = 0): StatsDay {
	return {
		date,
		status,
		totals: { pushups, squats: 100, situps: 100 },
		bonusPoints: bonus,
		overtimePoints: 0
	};
}

const days = [
	day('2026-10-09', 100),
	day('2026-10-10', 120, 'fulfilled', 50),
	day('2026-10-11', 0, 'sick'),
	day('2026-10-12', 100, 'fulfilled', 30)
];

describe('Reihen', () => {
	it('liefert Tageswerte je Kennzahl', () => {
		expect(series(days, 'pushups', 'day').map((point) => point.value)).toEqual([100, 120, 0, 100]);
		expect(series(days, 'all', 'day')[1].value).toBe(320);
		expect(series(days, 'bonus', 'day').map((point) => point.value)).toEqual([0, 50, 0, 30]);
		expect(series(days, 'all', 'day')[0].label).toBe('09.10.');
	});

	it('kumuliert über die Tage', () => {
		expect(series(days, 'pushups', 'cumulative').map((point) => point.value)).toEqual([100, 220, 220, 320]);
	});

	it('summiert pro Kalenderwoche ab Montag', () => {
		const weekly = series(days, 'pushups', 'week');
		expect(weekly).toEqual([
			{ key: '2026-10-05', label: 'KW 41', value: 220 },
			{ key: '2026-10-12', label: 'KW 42', value: 100 }
		]);
	});

	it('kennt ISO-Kalenderwochen über den Jahreswechsel', () => {
		expect(isoWeek('2026-12-31')).toBe(53);
		expect(isoWeek('2027-01-04')).toBe(1);
	});
});

describe('Kennzahlen', () => {
	it('fasst Summen, Durchschnitt, besten Tag und Status zusammen', () => {
		expect(kpis(days)).toEqual({
			totals: { pushups: 320, squats: 400, situps: 400 },
			bonus: 80,
			average: 280,
			best: { date: '2026-10-10', value: 320 },
			fulfilled: 3,
			sick: 1,
			missed: 0,
			days: 4
		});
	});

	it('ist ohne Tage leer', () => {
		expect(kpis([]).best).toBeNull();
		expect(kpis([]).average).toBe(0);
	});
});

describe('Zeiträume', () => {
	it('beginnen frühestens am Challenge-Start', () => {
		expect(rangeFor('7', '2026-10-20')).toEqual({ from: '2026-10-14', to: '2026-10-20' });
		expect(rangeFor('30', '2026-10-20')).toEqual({ from: '2026-10-09', to: '2026-10-20' });
		expect(rangeFor('all', '2026-11-30')).toEqual({ from: '2026-10-09', to: '2026-11-30' });
	});
});
