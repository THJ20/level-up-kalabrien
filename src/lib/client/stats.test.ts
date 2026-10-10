import { describe, expect, it } from 'vitest';
import type { DayStatus } from '#lib/domain/index.ts';
import { isoWeek, kpis, rangeFor, series, topExercises, type StatsDay } from './stats';

function day(date: string, pushups: number, status: DayStatus = 'fulfilled', bonus = 0): StatsDay {
	const progress = (Math.min(1, pushups / 100) + 2) / 3;
	return {
		date,
		status,
		progress: status === 'sick' ? 0 : progress,
		reps: pushups + (status === 'sick' ? 0 : 200),
		minutes: 0,
		km: 0,
		byExercise: { 'pushups:reps': pushups, ...(status === 'sick' ? {} : { 'squats:reps': 100, 'situps:reps': 100 }) },
		bonusPoints: bonus,
		overtimePoints: 0
	};
}

const days = [
	day('2026-10-11', 100, 'warmup'),
	day('2026-10-12', 120, 'fulfilled', 50),
	day('2026-10-13', 0, 'sick'),
	day('2026-10-14', 100, 'fulfilled', 30)
];

describe('Reihen', () => {
	it('liefert Tageswerte je Kennzahl', () => {
		expect(series(days, 'reps', 'day').map((point) => point.value)).toEqual([300, 320, 0, 300]);
		expect(series(days, 'progress', 'day').map((point) => point.value)).toEqual([100, 100, 0, 100]);
		expect(series(days, 'bonus', 'day').map((point) => point.value)).toEqual([0, 50, 0, 30]);
		expect(series(days, 'reps', 'day')[0].label).toBe('11.10.');
	});

	it('kumuliert Summen und mittelt die Planerfüllung', () => {
		expect(series(days, 'reps', 'cumulative').map((point) => point.value)).toEqual([300, 620, 620, 920]);
		expect(series(days, 'progress', 'cumulative').map((point) => point.value)).toEqual([100, 100, 66.7, 75]);
	});

	it('summiert pro Kalenderwoche ab Montag, Planerfüllung als Mittel', () => {
		expect(series(days, 'reps', 'week')).toEqual([
			{ key: '2026-10-05', label: 'KW 41', value: 300 },
			{ key: '2026-10-12', label: 'KW 42', value: 620 }
		]);
		expect(series(days, 'progress', 'week').map((point) => point.value)).toEqual([100, 66.7]);
	});

	it('kennt ISO-Kalenderwochen über den Jahreswechsel', () => {
		expect(isoWeek('2026-12-31')).toBe(53);
		expect(isoWeek('2027-01-04')).toBe(1);
	});
});

describe('Übungen', () => {
	it('wählt die häufigsten Wiederholungs-Übungen, der Rest wird „Andere“', () => {
		const exercises = [
			{ key: 'pushups:reps', name: 'Liegestütze', unit: 'reps' as const },
			{ key: 'squats:reps', name: 'Kniebeugen', unit: 'reps' as const },
			{ key: 'situps:reps', name: 'Sit-ups', unit: 'reps' as const },
			{ key: 'plank:minutes', name: 'Plank', unit: 'minutes' as const }
		];
		const result = topExercises(days, exercises, 2);
		expect(result.top.map((exercise) => exercise.name)).toEqual(['Liegestütze', 'Kniebeugen']);
		expect(result.others.map((exercise) => exercise.name)).toEqual(['Sit-ups']);
	});
});

describe('Kennzahlen', () => {
	it('fasst Summen, Planerfüllung, besten Tag und Status zusammen', () => {
		expect(kpis(days)).toEqual({
			reps: 920,
			minutes: 0,
			km: 0,
			bonus: 80,
			averageProgress: 67,
			best: { date: '2026-10-12', value: 320 },
			fulfilled: 2,
			sick: 1,
			missed: 0,
			days: 4
		});
	});

	it('ist ohne Tage leer', () => {
		expect(kpis([]).best).toBeNull();
		expect(kpis([]).averageProgress).toBe(0);
	});
});

describe('Zeiträume', () => {
	it('beginnen frühestens am ersten Aufwärmtag', () => {
		expect(rangeFor('7', '2026-10-20')).toEqual({ from: '2026-10-14', to: '2026-10-20' });
		expect(rangeFor('30', '2026-10-20')).toEqual({ from: '2026-10-09', to: '2026-10-20' });
		expect(rangeFor('all', '2026-11-30')).toEqual({ from: '2026-10-09', to: '2026-11-30' });
	});
});
