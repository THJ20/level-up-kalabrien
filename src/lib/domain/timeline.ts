import {
	CHALLENGE_END,
	CHALLENGE_START,
	addDays,
	challengeDayNumber,
	endOfDay,
	type LocalDate
} from './challenge';
import {
	EXERCISES,
	completionTime,
	emptyTotals,
	isQuestComplete,
	totalsOf,
	type ExerciseTotals,
	type QuestSet
} from './quest';
import { overtimeBonusPoints } from './bonus';

export type DayStatus = 'fulfilled' | 'sick' | 'open' | 'unscored' | 'missed';

export interface SickNote {
	date: LocalDate;
	recordedAt: Date;
}

export interface BonusEntry {
	id: string;
	date: LocalDate;
	bonusPoints: number;
	distanceKm: number | null;
	isRunning: boolean;
	recordedAt: Date;
}

export interface HunterRecords {
	scoringStart: LocalDate;
	sets: readonly QuestSet[];
	sickNotes: readonly SickNote[];
	bonusEntries: readonly BonusEntry[];
}

export interface DaySummary {
	date: LocalDate;
	dayNumber: number;
	status: DayStatus;
	backfilled: boolean;
	totals: ExerciseTotals;
	completedAt: Date | null;
	bonusPoints: number;
	overtimePoints: number;
}

export function dayStatus(input: {
	date: LocalDate;
	today: LocalDate;
	scoringStart: LocalDate;
	totals: ExerciseTotals;
	sick: boolean;
}): DayStatus {
	if (isQuestComplete(input.totals)) return 'fulfilled';
	if (input.sick) return 'sick';
	if (input.date >= input.today) return 'open';
	if (input.date < input.scoringStart) return 'unscored';
	return 'missed';
}

function groupByDate<T extends { date: LocalDate }>(items: readonly T[]): Map<LocalDate, T[]> {
	const groups = new Map<LocalDate, T[]>();
	for (const item of items) {
		const group = groups.get(item.date);
		if (group) group.push(item);
		else groups.set(item.date, [item]);
	}
	return groups;
}

/** Tagesübersicht eines Hunters vom Challenge-Start bis heute (höchstens bis Tag 202). */
export function buildTimeline(records: HunterRecords, today: LocalDate): DaySummary[] {
	const lastDay = today < CHALLENGE_END ? today : CHALLENGE_END;
	if (lastDay < CHALLENGE_START) return [];

	const setsByDate = groupByDate(records.sets);
	const sickByDate = groupByDate(records.sickNotes);
	const bonusByDate = groupByDate(records.bonusEntries);
	const timeline: DaySummary[] = [];

	for (let date = CHALLENGE_START; date <= lastDay; date = addDays(date, 1)) {
		const sets = setsByDate.get(date) ?? [];
		const sickNotes = sickByDate.get(date) ?? [];
		const bonusEntries = bonusByDate.get(date) ?? [];
		const totals = totalsOf(sets);
		const status = dayStatus({
			date,
			today,
			scoringStart: records.scoringStart,
			totals,
			sick: sickNotes.length > 0
		});
		const dayEnd = endOfDay(date);
		const backfilled =
			status === 'fulfilled'
				? sets.some((entry) => entry.recordedAt >= dayEnd)
				: status === 'sick'
					? sickNotes.some((note) => note.recordedAt >= dayEnd)
					: false;

		timeline.push({
			date,
			dayNumber: challengeDayNumber(date) as number,
			status,
			backfilled,
			totals,
			completedAt: status === 'fulfilled' ? completionTime(sets) : null,
			bonusPoints: bonusEntries.reduce((sum, entry) => sum + entry.bonusPoints, 0),
			overtimePoints: overtimeBonusPoints(totals)
		});
	}
	return timeline;
}

export function fulfilledDays(timeline: readonly DaySummary[]): number {
	return timeline.filter((day) => day.status === 'fulfilled').length;
}

export function totalBonusPoints(timeline: readonly DaySummary[]): number {
	return timeline.reduce((sum, day) => sum + day.bonusPoints + day.overtimePoints, 0);
}

export function volumeTotals(timeline: readonly DaySummary[]): ExerciseTotals {
	const totals = emptyTotals();
	for (const day of timeline) {
		for (const exercise of EXERCISES) totals[exercise] += day.totals[exercise];
	}
	return totals;
}
