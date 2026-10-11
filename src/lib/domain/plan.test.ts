import { describe, expect, it } from 'vitest';
import {
	MAX_PLAN_ITEMS,
	MIN_PLAN_ITEMS,
	defaultPlan,
	defaultPlanItems,
	isValidSetValue,
	isValidTarget,
	planError,
	planFor,
	roundToUnit,
	unitsFor,
	type PlanItem,
	type PlanVersion
} from './plan';

const plank: PlanItem = { exerciseId: 'plank', name: 'Plank', unit: 'minutes', target: 3, secondsPerRep: null };

describe('Startplan', () => {
	it('ist 3 x 100 Wiederholungen mit den Kernübungen ab dem ersten Aufwärmtag', () => {
		expect(defaultPlan().validFrom).toBe('2026-10-09');
		expect(defaultPlanItems().map((item) => [item.exerciseId, item.target, item.unit])).toEqual([
			['pushups', 100, 'reps'],
			['squats', 100, 'reps'],
			['situps', 100, 'reps']
		]);
	});
});

describe('planFor', () => {
	const versions: PlanVersion[] = [
		{ validFrom: '2026-10-09', items: defaultPlanItems() },
		{ validFrom: '2026-10-20', items: [plank] }
	];

	it('nimmt die jüngste Version, die spätestens am Tag beginnt', () => {
		expect(planFor(versions, '2026-10-19')).toEqual(defaultPlanItems());
		expect(planFor(versions, '2026-10-20')).toEqual([plank]);
		expect(planFor(versions, '2027-01-01')).toEqual([plank]);
	});

	it('fällt vor der ersten Version auf die erste und ohne Versionen auf den Startplan zurück', () => {
		expect(planFor([{ validFrom: '2026-10-15', items: [plank] }], '2026-10-10')).toEqual([plank]);
		expect(planFor([], '2026-10-10')).toEqual(defaultPlanItems());
	});
});

describe('Prüfung', () => {
	it('kennt die Grenzen je Einheit', () => {
		expect(isValidTarget('reps', 1000)).toBe(true);
		expect(isValidTarget('reps', 1001)).toBe(false);
		expect(isValidTarget('reps', 10.5)).toBe(false);
		expect(isValidTarget('minutes', 600)).toBe(true);
		expect(isValidTarget('km', 0.1)).toBe(true);
		expect(isValidTarget('km', 2.55)).toBe(false);
		expect(isValidTarget('km', 0.3)).toBe(true);
		expect(isValidSetValue('reps', 500)).toBe(true);
		expect(isValidSetValue('reps', 501)).toBe(false);
		expect(isValidSetValue('km', 0)).toBe(false);
	});

	it('rundet auf die Genauigkeit der Einheit', () => {
		expect(roundToUnit('km', 0.1 + 0.2)).toBe(0.3);
		expect(roundToUnit('reps', 59.6)).toBe(60);
	});

	it('verlangt 3 bis 5 Übungen, jede nur einmal, mit gültigem Ziel', () => {
		const ofSize = (count: number) =>
			Array.from({ length: count }, (_, index) => ({ ...plank, exerciseId: `e${index}` }));
		expect(planError(defaultPlanItems())).toBeNull();
		expect(planError(ofSize(MAX_PLAN_ITEMS))).toBeNull();
		expect(planError([])).toMatch(/3 bis 5 Übungen/);
		expect(planError(ofSize(MIN_PLAN_ITEMS - 1))).toMatch(/3 bis 5 Übungen/);
		expect(planError(ofSize(MAX_PLAN_ITEMS + 1))).toMatch(/3 bis 5 Übungen/);
		expect(planError([plank, plank, { ...plank, exerciseId: 'x' }])).toMatch(/nur einmal/);
		expect(planError([{ ...plank, target: 0 }, ...ofSize(2)])).toMatch(/zwischen 1 und 600/);
	});

	it('bietet passende Einheiten je Übungsart an', () => {
		expect(unitsFor({ kind: 'reps', tracksDistance: false })).toEqual(['reps']);
		expect(unitsFor({ kind: 'time', tracksDistance: false })).toEqual(['minutes']);
		expect(unitsFor({ kind: 'time', tracksDistance: true })).toEqual(['minutes', 'km']);
	});
});
