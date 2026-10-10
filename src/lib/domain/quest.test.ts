import { describe, expect, it } from 'vitest';
import { defaultPlanItems, type PlanItem } from './plan';
import { completionTime, isQuestComplete, questProgress, totalsOf, type QuestSet } from './quest';

let sequence = 0;
function set(exerciseId: string, value: number, recordedAtIso: string): QuestSet {
	sequence += 1;
	return { id: `set-${sequence}`, date: '2026-10-12', exerciseId, value, recordedAt: new Date(recordedAtIso) };
}

const plan = defaultPlanItems();
const mixed: PlanItem[] = [
	{ exerciseId: 'pushups', name: 'Liegestütze', unit: 'reps', target: 50, secondsPerRep: 3 },
	{ exerciseId: 'plank', name: 'Plank', unit: 'minutes', target: 3, secondsPerRep: null },
	{ exerciseId: 'run', name: 'Laufen', unit: 'km', target: 2.5, secondsPerRep: null }
];

describe('Daily Quest', () => {
	it('summiert Sätze je Übung', () => {
		const totals = totalsOf([
			set('pushups', 40, '2026-10-12T06:00:00Z'),
			set('pushups', 60, '2026-10-12T07:00:00Z'),
			set('squats', 25, '2026-10-12T08:00:00Z')
		]);
		expect(totals).toEqual({ pushups: 100, squats: 25 });
	});

	it('summiert Kilometer ohne Kommafehler', () => {
		expect(totalsOf([set('run', 0.1, '2026-10-12T06:00:00Z'), set('run', 0.2, '2026-10-12T07:00:00Z')])).toEqual({
			run: 0.3
		});
	});

	it('ist erst erfüllt, wenn jeder Planpunkt sein Ziel erreicht', () => {
		expect(isQuestComplete(plan, { pushups: 100, squats: 100, situps: 99 })).toBe(false);
		expect(isQuestComplete(plan, { pushups: 100, squats: 150, situps: 100 })).toBe(true);
		expect(isQuestComplete(mixed, { pushups: 50, plank: 3, run: 2.4 })).toBe(false);
		expect(isQuestComplete(mixed, { pushups: 50, plank: 3, run: 2.5 })).toBe(true);
		expect(isQuestComplete([], {})).toBe(false);
	});

	it('misst den Fortschritt als Mittel der gekappten Anteile', () => {
		expect(questProgress(plan, {})).toBe(0);
		expect(questProgress(plan, { pushups: 200, squats: 50, situps: 0 })).toBeCloseTo(0.5, 6);
		expect(questProgress(mixed, { pushups: 50, plank: 3, run: 2.5 })).toBe(1);
	});

	it('findet den Satz, der die Quest abschließt, auch bei ungeordneter Eingabe', () => {
		const sets = [
			set('situps', 100, '2026-10-12T18:00:00Z'),
			set('pushups', 100, '2026-10-12T06:00:00Z'),
			set('squats', 50, '2026-10-12T07:00:00Z'),
			set('squats', 50, '2026-10-12T12:00:00Z')
		];
		expect(completionTime(plan, sets)?.toISOString()).toBe('2026-10-12T18:00:00.000Z');
	});

	it('liefert keinen Abschlusszeitpunkt für eine offene Quest', () => {
		expect(completionTime(plan, [set('pushups', 100, '2026-10-12T06:00:00Z')])).toBeNull();
	});
});
