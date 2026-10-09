import { describe, expect, it } from 'vitest';
import { startOfDay, type LocalDate } from './challenge';
import type { Exercise, QuestSet } from './quest';
import {
	buildTimeline,
	dayStatus,
	fulfilledDays,
	totalBonusPoints,
	volumeTotals,
	type BonusEntry,
	type HunterRecords
} from './timeline';

let sequence = 0;

function at(date: LocalDate, hour: number): Date {
	return new Date(startOfDay(date).getTime() + hour * 3_600_000);
}

function set(date: LocalDate, exercise: Exercise, reps: number, recordedAt = at(date, 12)): QuestSet {
	sequence += 1;
	return { id: `set-${sequence}`, date, exercise, reps, recordedAt };
}

function fullDay(date: LocalDate, recordedAt = at(date, 12)): QuestSet[] {
	return [
		set(date, 'pushups', 100, recordedAt),
		set(date, 'squats', 100, recordedAt),
		set(date, 'situps', 100, recordedAt)
	];
}

function records(partial: Partial<HunterRecords> = {}): HunterRecords {
	return { scoringStart: '2026-10-09', sets: [], sickNotes: [], bonusEntries: [], ...partial };
}

describe('dayStatus', () => {
	const full = { pushups: 100, squats: 100, situps: 100 };
	const partial = { pushups: 100, squats: 40, situps: 0 };
	const base = { today: '2026-10-12', scoringStart: '2026-10-09' };

	it('wertet einen erfüllten Tag auch mit Krankmeldung als erfüllt', () => {
		expect(dayStatus({ ...base, date: '2026-10-10', totals: full, sick: true })).toBe('fulfilled');
	});

	it('wertet einen krank gemeldeten Tag als krank', () => {
		expect(dayStatus({ ...base, date: '2026-10-10', totals: partial, sick: true })).toBe('sick');
	});

	it('lässt den heutigen Tag offen', () => {
		expect(dayStatus({ ...base, date: '2026-10-12', totals: partial, sick: false })).toBe('open');
	});

	it('wertet Tage vor dem Wertungsbeginn nicht', () => {
		expect(
			dayStatus({ ...base, scoringStart: '2026-10-10', date: '2026-10-09', totals: partial, sick: false })
		).toBe('unscored');
	});

	it('wertet übrige vergangene Tage als verpasst', () => {
		expect(dayStatus({ ...base, date: '2026-10-11', totals: partial, sick: false })).toBe('missed');
	});
});

describe('buildTimeline', () => {
	it('reicht vom Start bis heute', () => {
		expect(buildTimeline(records(), '2026-10-12').map((day) => day.date)).toEqual([
			'2026-10-09',
			'2026-10-10',
			'2026-10-11',
			'2026-10-12'
		]);
	});

	it('ist vor dem Start leer', () => {
		expect(buildTimeline(records(), '2026-10-08')).toEqual([]);
	});

	it('endet am Tag 202', () => {
		const timeline = buildTimeline(records(), '2027-06-01');
		expect(timeline).toHaveLength(202);
		expect(timeline[201].date).toBe('2027-04-28');
		expect(timeline[201].status).toBe('missed');
	});

	it('leitet Status, Summen, Tagnummer und Abschlusszeit ab', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-09'), set('2026-10-10', 'pushups', 60)],
				sickNotes: [{ date: '2026-10-11', recordedAt: at('2026-10-11', 9) }]
			}),
			'2026-10-12'
		);
		expect(timeline.map((day) => day.status)).toEqual(['fulfilled', 'missed', 'sick', 'open']);
		expect(timeline[0].dayNumber).toBe(1);
		expect(timeline[0].totals).toEqual({ pushups: 100, squats: 100, situps: 100 });
		expect(timeline[0].completedAt).toEqual(at('2026-10-09', 12));
		expect(timeline[1].completedAt).toBeNull();
	});

	it('markiert nachgetragene Tage', () => {
		const nextMorning = at('2026-10-10', 30);
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-09'), ...fullDay('2026-10-10', nextMorning)],
				sickNotes: [{ date: '2026-10-11', recordedAt: at('2026-10-12', 8) }]
			}),
			'2026-10-12'
		);
		expect(timeline.map((day) => day.backfilled)).toEqual([false, true, true, false]);
	});

	it('summiert Bonuspunkte und Overtime pro Tag', () => {
		const bonusEntries: BonusEntry[] = [
			{ id: 'b1', date: '2026-10-09', bonusPoints: 150, distanceKm: 5, isRunning: true, recordedAt: at('2026-10-09', 18) },
			{ id: 'b2', date: '2026-10-09', bonusPoints: 70, distanceKm: null, isRunning: false, recordedAt: at('2026-10-09', 19) }
		];
		const timeline = buildTimeline(
			records({ sets: [...fullDay('2026-10-09'), set('2026-10-09', 'pushups', 50)], bonusEntries }),
			'2026-10-09'
		);
		expect(timeline[0].bonusPoints).toBe(220);
		expect(timeline[0].overtimePoints).toBe(17.5);
	});

	it('liefert Kennzahlen über die ganze Übersicht', () => {
		const timeline = buildTimeline(
			records({ sets: [...fullDay('2026-10-09'), ...fullDay('2026-10-10'), set('2026-10-10', 'squats', 20)] }),
			'2026-10-11'
		);
		expect(fulfilledDays(timeline)).toBe(2);
		expect(volumeTotals(timeline)).toEqual({ pushups: 200, squats: 220, situps: 200 });
		expect(totalBonusPoints(timeline)).toBe(7);
	});
});
