import { CHALLENGE_START, addDays } from './challenge';
import { QUEST_TARGET, emptyTotals } from './quest';
import type { DayStatus, DaySummary } from './timeline';

/** Baut eine Tagesübersicht ab Challenge-Start aus einer Liste von Tagesstatus. */
export function timelineOf(statuses: readonly DayStatus[]): DaySummary[] {
	return statuses.map((status, index) => ({
		date: addDays(CHALLENGE_START, index),
		dayNumber: index + 1,
		status,
		backfilled: false,
		totals:
			status === 'fulfilled'
				? { pushups: QUEST_TARGET, squats: QUEST_TARGET, situps: QUEST_TARGET }
				: emptyTotals(),
		completedAt: null,
		bonusPoints: 0,
		overtimePoints: 0
	}));
}

export function repeat(status: DayStatus, count: number): DayStatus[] {
	return Array.from({ length: count }, () => status);
}
