import { describe, expect, it } from 'vitest';
import {
	completionTime,
	isQuestComplete,
	isValidSetReps,
	totalsOf,
	type Exercise,
	type QuestSet
} from './quest';

let sequence = 0;
function set(exercise: Exercise, reps: number, recordedAtIso: string): QuestSet {
	sequence += 1;
	return {
		id: `set-${sequence}`,
		date: '2026-10-09',
		exercise,
		reps,
		recordedAt: new Date(recordedAtIso)
	};
}

describe('Daily Quest', () => {
	it('summiert Sätze je Übung', () => {
		const totals = totalsOf([
			set('pushups', 40, '2026-10-09T06:00:00Z'),
			set('pushups', 60, '2026-10-09T07:00:00Z'),
			set('squats', 25, '2026-10-09T08:00:00Z')
		]);
		expect(totals).toEqual({ pushups: 100, squats: 25, situps: 0 });
	});

	it('ist erst erfüllt, wenn jede Übung 100 erreicht', () => {
		expect(isQuestComplete({ pushups: 100, squats: 100, situps: 99 })).toBe(false);
		expect(isQuestComplete({ pushups: 100, squats: 150, situps: 100 })).toBe(true);
	});

	it('findet den Satz, der die Quest abschließt, auch bei ungeordneter Eingabe', () => {
		const sets = [
			set('situps', 100, '2026-10-09T18:00:00Z'),
			set('pushups', 100, '2026-10-09T06:00:00Z'),
			set('squats', 50, '2026-10-09T07:00:00Z'),
			set('squats', 50, '2026-10-09T12:00:00Z')
		];
		expect(completionTime(sets)?.toISOString()).toBe('2026-10-09T18:00:00.000Z');
	});

	it('liefert keinen Abschlusszeitpunkt für eine offene Quest', () => {
		expect(completionTime([set('pushups', 100, '2026-10-09T06:00:00Z')])).toBeNull();
	});

	it('akzeptiert 1 bis 500 ganze Wiederholungen pro Satz', () => {
		expect(isValidSetReps(1)).toBe(true);
		expect(isValidSetReps(500)).toBe(true);
		expect(isValidSetReps(0)).toBe(false);
		expect(isValidSetReps(501)).toBe(false);
		expect(isValidSetReps(10.5)).toBe(false);
	});
});
