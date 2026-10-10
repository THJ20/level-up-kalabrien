import { describe, expect, it } from 'vitest';
import {
	displayPoints,
	isValidBonusReps,
	isValidMinutes,
	isValidSecondsPerRep,
	overtimeBonusPoints,
	repsBonusPoints,
	timeBonusPoints
} from './bonus';
import { defaultPlanItems, type PlanItem } from './plan';

describe('Bonuspunkte nach Anstrengung', () => {
	it('rechnet Zeit-Übungen als Minuten mal Stufe', () => {
		expect(timeBonusPoints(60, 'hard')).toBe(420);
		expect(timeBonusPoints(30, 'moderate')).toBe(150);
		expect(timeBonusPoints(20, 'max')).toBe(180);
		expect(timeBonusPoints(40, 'easy')).toBe(120);
	});

	it('rechnet Wiederholungs-Übungen über die Dauer pro Wiederholung', () => {
		expect(repsBonusPoints(50, 3, 'hard')).toBe(17.5);
		expect(repsBonusPoints(20, 4, 'max')).toBe(12);
	});

	it('wertet nur Mehrleistung über das Planziel', () => {
		const plan = defaultPlanItems();
		expect(overtimeBonusPoints(plan, { pushups: 150, squats: 100, situps: 90 })).toBe(17.5);
		expect(overtimeBonusPoints(plan, { pushups: 120, squats: 130, situps: 100 })).toBe(17.5);
		expect(overtimeBonusPoints(plan, { pushups: 100, squats: 100, situps: 100 })).toBe(0);
	});

	it('nutzt die Sekunden der Übung, Minuten mal 7 und keine BP für Kilometer', () => {
		const plan: PlanItem[] = [
			{ exerciseId: 'pull', name: 'Klimmzüge', unit: 'reps', target: 20, secondsPerRep: 4 },
			{ exerciseId: 'plank', name: 'Plank', unit: 'minutes', target: 3, secondsPerRep: null },
			{ exerciseId: 'run', name: 'Laufen', unit: 'km', target: 2, secondsPerRep: null }
		];
		expect(overtimeBonusPoints(plan, { pull: 35, plank: 5, run: 4 })).toBe(7 + 14);
	});

	it('rundet für die Anzeige auf ganze Punkte', () => {
		expect(displayPoints(17.5)).toBe(18);
		expect(displayPoints(17.4)).toBe(17);
	});

	it('prüft die Eingabegrenzen', () => {
		expect(isValidMinutes(1)).toBe(true);
		expect(isValidMinutes(600)).toBe(true);
		expect(isValidMinutes(0)).toBe(false);
		expect(isValidMinutes(601)).toBe(false);
		expect(isValidMinutes(12.5)).toBe(false);
		expect(isValidBonusReps(1000)).toBe(true);
		expect(isValidBonusReps(1001)).toBe(false);
		expect(isValidSecondsPerRep(2)).toBe(true);
		expect(isValidSecondsPerRep(10)).toBe(true);
		expect(isValidSecondsPerRep(1)).toBe(false);
		expect(isValidSecondsPerRep(11)).toBe(false);
	});
});
