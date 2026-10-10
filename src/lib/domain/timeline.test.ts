import { describe, expect, it } from 'vitest';
import { startOfDay, type LocalDate } from './challenge';
import { defaultPlanItems, type PlanItem } from './plan';
import type { QuestSet } from './quest';
import {
	buildTimeline,
	dayStatus,
	fulfilledDays,
	totalBonusPoints,
	volumeOf,
	type BonusEntry,
	type HunterRecords
} from './timeline';

let sequence = 0;

function at(date: LocalDate, hour: number): Date {
	return new Date(startOfDay(date).getTime() + hour * 3_600_000);
}

function set(date: LocalDate, exerciseId: string, value: number, recordedAt = at(date, 12)): QuestSet {
	sequence += 1;
	return { id: `set-${sequence}`, date, exerciseId, value, recordedAt };
}

function fullDay(date: LocalDate, recordedAt = at(date, 12)): QuestSet[] {
	return [set(date, 'pushups', 100, recordedAt), set(date, 'squats', 100, recordedAt), set(date, 'situps', 100, recordedAt)];
}

function bonus(partial: Partial<BonusEntry> & { id: string; date: LocalDate }): BonusEntry {
	return {
		bonusPoints: 0,
		minutes: null,
		reps: null,
		distanceKm: null,
		isRunning: false,
		recordedAt: at(partial.date, 18),
		...partial
	};
}

function records(partial: Partial<HunterRecords> = {}): HunterRecords {
	return {
		scoringStart: '2026-10-12',
		plans: [{ validFrom: '2026-10-09', items: defaultPlanItems() }],
		sets: [],
		sickNotes: [],
		bonusEntries: [],
		...partial
	};
}

const plank: PlanItem = { exerciseId: 'plank', name: 'Plank', unit: 'minutes', target: 3, secondsPerRep: null };

describe('dayStatus', () => {
	const base = { today: '2026-10-15', scoringStart: '2026-10-12' };

	it('macht aus den Tagen vor dem Start Aufwärmtage, egal was eingetragen ist', () => {
		expect(dayStatus({ ...base, date: '2026-10-09', complete: true, sick: false })).toBe('warmup');
		expect(dayStatus({ ...base, date: '2026-10-11', complete: false, sick: true })).toBe('warmup');
	});

	it('wertet einen erfüllten Tag auch mit Krankmeldung als erfüllt', () => {
		expect(dayStatus({ ...base, date: '2026-10-13', complete: true, sick: true })).toBe('fulfilled');
	});

	it('wertet einen krank gemeldeten Tag als krank', () => {
		expect(dayStatus({ ...base, date: '2026-10-13', complete: false, sick: true })).toBe('sick');
	});

	it('lässt den heutigen Tag offen', () => {
		expect(dayStatus({ ...base, date: '2026-10-15', complete: false, sick: false })).toBe('open');
	});

	it('wertet leere Tage vor dem Wertungsbeginn nicht, erfüllte aber schon', () => {
		const early = { ...base, scoringStart: '2026-10-14', date: '2026-10-12' };
		expect(dayStatus({ ...early, complete: false, sick: false })).toBe('unscored');
		expect(dayStatus({ ...early, complete: true, sick: false })).toBe('fulfilled');
	});

	it('wertet übrige vergangene Tage als verpasst', () => {
		expect(dayStatus({ ...base, date: '2026-10-14', complete: false, sick: false })).toBe('missed');
	});
});

describe('buildTimeline', () => {
	it('reicht vom ersten Aufwärmtag bis heute', () => {
		const timeline = buildTimeline(records(), '2026-10-12');
		expect(timeline.map((day) => [day.date, day.status, day.dayNumber])).toEqual([
			['2026-10-09', 'warmup', null],
			['2026-10-10', 'warmup', null],
			['2026-10-11', 'warmup', null],
			['2026-10-12', 'open', 1]
		]);
	});

	it('ist vor dem ersten Aufwärmtag leer', () => {
		expect(buildTimeline(records(), '2026-10-08')).toEqual([]);
	});

	it('endet am Tag 199', () => {
		const timeline = buildTimeline(records(), '2027-06-01');
		expect(timeline).toHaveLength(202);
		expect(timeline.at(-1)?.date).toBe('2027-04-28');
		expect(timeline.at(-1)?.dayNumber).toBe(199);
		expect(timeline.at(-1)?.status).toBe('missed');
	});

	it('leitet Status, Summen, Fortschritt und Abschlusszeit ab', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-12'), set('2026-10-13', 'pushups', 60)],
				sickNotes: [{ date: '2026-10-14', recordedAt: at('2026-10-14', 9) }]
			}),
			'2026-10-15'
		).slice(3);
		expect(timeline.map((day) => day.status)).toEqual(['fulfilled', 'missed', 'sick', 'open']);
		expect(timeline[0].totals).toEqual({ pushups: 100, squats: 100, situps: 100 });
		expect(timeline[0].complete).toBe(true);
		expect(timeline[0].completedAt).toEqual(at('2026-10-12', 12));
		expect(timeline[1].progress).toBeCloseTo(0.2, 6);
		expect(timeline[1].completedAt).toBeNull();
	});

	it('zeigt erfüllte Aufwärmtage als erfüllt, ohne sie zu werten', () => {
		const timeline = buildTimeline(records({ sets: fullDay('2026-10-10') }), '2026-10-12');
		expect(timeline[1]).toMatchObject({ status: 'warmup', complete: true });
		expect(fulfilledDays(timeline)).toBe(0);
	});

	it('misst jeden Tag am damals gültigen Plan', () => {
		const timeline = buildTimeline(
			records({
				plans: [
					{ validFrom: '2026-10-09', items: defaultPlanItems() },
					{ validFrom: '2026-10-13', items: [plank] }
				],
				sets: [set('2026-10-12', 'plank', 3), set('2026-10-13', 'plank', 3)]
			}),
			'2026-10-14'
		).slice(3);
		expect(timeline.map((day) => day.status)).toEqual(['missed', 'fulfilled', 'open']);
		expect(timeline[1].plan).toEqual([plank]);
	});

	it('markiert nachgetragene Tage', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-12'), ...fullDay('2026-10-13', at('2026-10-13', 30))],
				sickNotes: [{ date: '2026-10-14', recordedAt: at('2026-10-15', 8) }]
			}),
			'2026-10-15'
		).slice(3);
		expect(timeline.map((day) => day.backfilled)).toEqual([false, true, true, false]);
	});

	it('summiert Bonuspunkte und Mehrleistung pro Tag', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-12'), set('2026-10-12', 'pushups', 50)],
				bonusEntries: [
					bonus({ id: 'b1', date: '2026-10-12', bonusPoints: 150, distanceKm: 5, isRunning: true }),
					bonus({ id: 'b2', date: '2026-10-12', bonusPoints: 70 })
				]
			}),
			'2026-10-12'
		);
		expect(timeline[3].bonusPoints).toBe(220);
		expect(timeline[3].overtimePoints).toBe(17.5);
	});

	it('zählt Bonuspunkte von Aufwärmtagen nicht mit', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-10'), set('2026-10-10', 'pushups', 50)],
				bonusEntries: [bonus({ id: 'b1', date: '2026-10-10', bonusPoints: 100 })]
			}),
			'2026-10-12'
		);
		expect(timeline[1].bonusPoints).toBe(100);
		expect(totalBonusPoints(timeline)).toBe(0);
	});
});

describe('Volumen', () => {
	it('summiert Daily Quest je Einheit und Übung, mit Aufwärmtagen und Zusatzübungen', () => {
		const timeline = buildTimeline(
			records({
				plans: [
					{ validFrom: '2026-10-09', items: defaultPlanItems() },
					{ validFrom: '2026-10-13', items: [plank, { ...plank, exerciseId: 'run', name: 'Laufen', unit: 'km', target: 2 }] }
				],
				sets: [...fullDay('2026-10-11'), ...fullDay('2026-10-12'), set('2026-10-13', 'plank', 4), set('2026-10-13', 'run', 2.5)]
			}),
			'2026-10-13'
		);
		const volume = volumeOf(timeline, [
			bonus({ id: 'b1', date: '2026-10-13', minutes: 30, distanceKm: 5 }),
			bonus({ id: 'b2', date: '2026-10-13', reps: 20 })
		]);
		expect(volume.reps).toBe(620);
		expect(volume.minutes).toBe(34);
		expect(volume.km).toBe(7.5);
		expect(volume.byExercise.map((entry) => [entry.exerciseId, entry.total])).toEqual([
			['pushups', 200],
			['squats', 200],
			['situps', 200],
			['plank', 4],
			['run', 2.5]
		]);
	});
});
