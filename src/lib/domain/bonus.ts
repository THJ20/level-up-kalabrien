import { EXERCISES, QUEST_TARGET, type ExerciseTotals } from './quest';

export const EFFORTS = ['easy', 'moderate', 'hard', 'max'] as const;
export type Effort = (typeof EFFORTS)[number];

/** Stufenfaktoren nach Session-RPE (Foster): Trainingslast = Dauer × Anstrengung. */
export const EFFORT_FACTOR: Record<Effort, number> = { easy: 3, moderate: 5, hard: 7, max: 9 };

export const EFFORT_LABELS: Record<Effort, string> = {
	easy: 'locker',
	moderate: 'moderat',
	hard: 'hart',
	max: 'am Limit'
};

export const OVERTIME_SECONDS_PER_REP = 3;
export const OVERTIME_EFFORT: Effort = 'hard';
export const MAX_MINUTES = 600;
export const MAX_BONUS_REPS = 1000;
export const MIN_SECONDS_PER_REP = 2;
export const MAX_SECONDS_PER_REP = 10;

function isIntegerBetween(value: number, min: number, max: number): boolean {
	return Number.isInteger(value) && value >= min && value <= max;
}

export function isValidMinutes(minutes: number): boolean {
	return isIntegerBetween(minutes, 1, MAX_MINUTES);
}

export function isValidBonusReps(reps: number): boolean {
	return isIntegerBetween(reps, 1, MAX_BONUS_REPS);
}

export function isValidSecondsPerRep(seconds: number): boolean {
	return isIntegerBetween(seconds, MIN_SECONDS_PER_REP, MAX_SECONDS_PER_REP);
}

export function timeBonusPoints(minutes: number, effort: Effort): number {
	return minutes * EFFORT_FACTOR[effort];
}

export function repsBonusPoints(reps: number, secondsPerRep: number, effort: Effort): number {
	return (reps * secondsPerRep * EFFORT_FACTOR[effort]) / 60;
}

/** BP für Wiederholungen über dem Pflichtpensum eines Tages. */
export function overtimeBonusPoints(totals: ExerciseTotals): number {
	return EXERCISES.reduce((sum, exercise) => {
		const extraReps = Math.max(0, totals[exercise] - QUEST_TARGET);
		return sum + repsBonusPoints(extraReps, OVERTIME_SECONDS_PER_REP, OVERTIME_EFFORT);
	}, 0);
}

export function displayPoints(points: number): number {
	return Math.round(points);
}
