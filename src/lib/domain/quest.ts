import type { LocalDate } from './challenge';

export const EXERCISES = ['pushups', 'squats', 'situps'] as const;
export type Exercise = (typeof EXERCISES)[number];

export const EXERCISE_LABELS: Record<Exercise, string> = {
	pushups: 'PUSH-UPS',
	squats: 'SQUATS',
	situps: 'SIT-UPS'
};

export const QUEST_TARGET = 100;
export const MAX_REPS_PER_SET = 500;

export interface QuestSet {
	id: string;
	date: LocalDate;
	exercise: Exercise;
	reps: number;
	recordedAt: Date;
}

export type ExerciseTotals = Record<Exercise, number>;

export function isValidSetReps(reps: number): boolean {
	return Number.isInteger(reps) && reps >= 1 && reps <= MAX_REPS_PER_SET;
}

export function emptyTotals(): ExerciseTotals {
	return { pushups: 0, squats: 0, situps: 0 };
}

export function totalsOf(sets: readonly QuestSet[]): ExerciseTotals {
	const totals = emptyTotals();
	for (const entry of sets) totals[entry.exercise] += entry.reps;
	return totals;
}

export function isQuestComplete(totals: ExerciseTotals): boolean {
	return EXERCISES.every((exercise) => totals[exercise] >= QUEST_TARGET);
}

/** Erfassungszeitpunkt des Satzes, mit dem die Daily Quest eines Tages erfüllt wurde. */
export function completionTime(setsOfDay: readonly QuestSet[]): Date | null {
	const ordered = [...setsOfDay].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
	const totals = emptyTotals();
	for (const entry of ordered) {
		totals[entry.exercise] += entry.reps;
		if (isQuestComplete(totals)) return entry.recordedAt;
	}
	return null;
}
