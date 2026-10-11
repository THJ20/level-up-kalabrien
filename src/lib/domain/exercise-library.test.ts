import { describe, expect, it } from 'vitest';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, groupsOf, libraryEntry, suggestRotation } from './exercise-library';
import { defaultPlanItems, isValidTarget, type PlanItem } from './plan';
import { isValidSecondsPerRep } from './bonus';

const item = (name: string, target = 50, unit: PlanItem['unit'] = 'reps'): PlanItem => ({
	exerciseId: name,
	name,
	unit,
	target,
	secondsPerRep: unit === 'reps' ? 3 : null
});

describe('Übungsbibliothek', () => {
	it('hat für jede Muskelgruppe Übungen mit gültigen Zielen', () => {
		for (const group of MUSCLE_GROUPS) {
			expect(EXERCISE_LIBRARY.some((entry) => entry.groups[0] === group)).toBe(true);
		}
		for (const entry of EXERCISE_LIBRARY) {
			expect(isValidTarget(entry.unit, entry.target)).toBe(true);
			if (entry.secondsPerRep !== null) expect(isValidSecondsPerRep(entry.secondsPerRep)).toBe(true);
			expect(entry.name.length).toBeLessThanOrEqual(40);
		}
	});

	it('erkennt Katalognamen und andere Schreibweisen', () => {
		expect(groupsOf('Liegestütze')).toEqual(['push', 'shoulders']);
		expect(groupsOf('Diamond-Liegestütze')).toEqual(['push']);
		expect(groupsOf('Sit-ups/Crunches')).toEqual(['core']);
		expect(groupsOf('Plank')).toEqual(['core', 'shoulders']);
		expect(groupsOf('Glute Bridges')).toEqual(['glutes']);
		expect(libraryEntry('Laufen/Joggen')?.unit).toBe('km');
		expect(groupsOf('Tanzen')).toEqual([]);
	});
});

describe('Tauschvorschläge', () => {
	it('bringt beim Startplan Rücken und Ausdauer ins Spiel und tauscht höchstens zwei Übungen', () => {
		const suggestion = suggestRotation({ current: defaultPlanItems(), history: [] });
		expect(suggestion.trained).toEqual(['push', 'shoulders', 'core', 'legs', 'glutes']);
		expect(suggestion.focus).toEqual(['pull', 'cardio']);
		expect(suggestion.swaps.map((swap) => [swap.replace.name, swap.with.name])).toEqual([
			['Liegestütze', 'Superman'],
			['Kniebeugen', 'Burpees']
		]);
	});

	it('tauscht zuerst Übungen, deren Muskelgruppen doppelt vorkommen', () => {
		const suggestion = suggestRotation({
			current: [item('Kniebeugen'), item('Ausfallschritte'), item('Liegestütze'), item('Unterarmstütz', 3, 'minutes')],
			history: [],
			maxSwaps: 1
		});
		expect(suggestion.swaps[0].replace.name).toBe('Kniebeugen');
		expect(suggestion.swaps[0].group).toBe('pull');
	});

	it('zieht frühere Pläne hinzu: zuletzt trainierte Gruppen später, schon genutzte Übungen nicht noch mal', () => {
		const suggestion = suggestRotation({ current: defaultPlanItems(), history: [[item('Superman')]] });
		expect(suggestion.focus).toEqual(['cardio', 'pull']);
		expect(suggestion.swaps.map((swap) => swap.with.name)).toEqual(['Burpees', 'Reverse Snow Angels']);
	});

	it('schlägt nichts vor, wenn schon alle Muskelgruppen drin sind', () => {
		const suggestion = suggestRotation({
			current: [item('Burpees'), item('Superman'), item('Pike-Liegestütze'), item('Mountain Climbers'), item('Kniebeugen')],
			history: []
		});
		expect(suggestion.swaps).toEqual([]);
	});
});
