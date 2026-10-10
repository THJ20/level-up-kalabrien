import { CHALLENGE_START, addDays } from './challenge';
import { DEFAULT_TARGET, defaultPlanItems } from './plan';
import type { DayStatus, DaySummary } from './timeline';

/** Baut eine Tagesübersicht ab Tag 1 aus einer Liste von Tagesstatus, mit dem Startplan. */
export function timelineOf(statuses: readonly DayStatus[]): DaySummary[] {
	const plan = defaultPlanItems();
	return statuses.map((status, index) => {
		const complete = status === 'fulfilled';
		return {
			date: addDays(CHALLENGE_START, index),
			dayNumber: index + 1,
			status,
			backfilled: false,
			plan,
			totals: complete ? Object.fromEntries(plan.map((item) => [item.exerciseId, DEFAULT_TARGET])) : {},
			complete,
			progress: complete ? 1 : 0,
			completedAt: null,
			bonusPoints: 0,
			overtimePoints: 0
		};
	});
}

export function repeat(status: DayStatus, count: number): DayStatus[] {
	return Array.from({ length: count }, () => status);
}
