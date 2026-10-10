import type { PlanItem } from './plan';
import type { Totals } from './quest';

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

/** BP für alles, was über das Tagesziel der Planpunkte hinausgeht. Kilometer geben keine BP. */
export function overtimeBonusPoints(plan: readonly PlanItem[], totals: Totals): number {
	return plan.reduce((sum, item) => {
		const extra = Math.max(0, (totals[item.exerciseId] ?? 0) - item.target);
		if (extra <= 0) return sum;
		if (item.unit === 'reps') {
			return sum + repsBonusPoints(extra, item.secondsPerRep ?? OVERTIME_SECONDS_PER_REP, OVERTIME_EFFORT);
		}
		if (item.unit === 'minutes') return sum + timeBonusPoints(extra, OVERTIME_EFFORT);
		return sum;
	}, 0);
}

export function displayPoints(points: number): number {
	return Math.round(points);
}
