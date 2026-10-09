import type { LocalDate } from './challenge';
import type { DaySummary } from './timeline';

export type LiftReason = 'backfill' | 'sick';

export interface MissedDayChanges {
	create: LocalDate[];
	lift: { date: LocalDate; reason: LiftReason }[];
}

/**
 * Vergleicht den abgeleiteten Tagesstatus mit den aktiven Verpasst-Ereignissen.
 * Neue verpasste Tage werden angelegt, nachgetragene oder krank gemeldete aufgehoben.
 */
export function reconcileMissedDays(
	timeline: readonly DaySummary[],
	activeMissedDates: ReadonlySet<LocalDate>
): MissedDayChanges {
	const create: LocalDate[] = [];
	const lift: MissedDayChanges['lift'] = [];

	for (const day of timeline) {
		if (day.status === 'missed' && !activeMissedDates.has(day.date)) create.push(day.date);
		if (!activeMissedDates.has(day.date)) continue;
		if (day.status === 'fulfilled') lift.push({ date: day.date, reason: 'backfill' });
		else if (day.status === 'sick') lift.push({ date: day.date, reason: 'sick' });
	}
	return { create, lift };
}
