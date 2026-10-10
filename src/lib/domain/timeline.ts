import {
	CHALLENGE_END,
	WARMUP_START,
	addDays,
	challengeDayNumber,
	endOfDay,
	isWarmupDay,
	type LocalDate
} from './challenge';
import { completionTime, isQuestComplete, questProgress, totalsOf, type QuestSet, type Totals } from './quest';
import { planFor, type PlanItem, type PlanUnit, type PlanVersion } from './plan';
import { overtimeBonusPoints } from './bonus';

export type DayStatus = 'fulfilled' | 'sick' | 'open' | 'unscored' | 'missed' | 'warmup';

export interface SickNote {
	date: LocalDate;
	recordedAt: Date;
}

export interface BonusEntry {
	id: string;
	date: LocalDate;
	bonusPoints: number;
	minutes: number | null;
	reps: number | null;
	distanceKm: number | null;
	isRunning: boolean;
	recordedAt: Date;
}

export interface HunterRecords {
	scoringStart: LocalDate;
	plans: readonly PlanVersion[];
	sets: readonly QuestSet[];
	sickNotes: readonly SickNote[];
	bonusEntries: readonly BonusEntry[];
}

export interface DaySummary {
	date: LocalDate;
	/** Tag 1 bis 199, an Aufwärmtagen null. */
	dayNumber: number | null;
	status: DayStatus;
	backfilled: boolean;
	/** Plan, der an diesem Tag gilt. */
	plan: readonly PlanItem[];
	totals: Totals;
	/** Alle Planpunkte erreicht, auch an Aufwärmtagen. */
	complete: boolean;
	/** 0 bis 1, Mittel der gekappten Anteile aller Planpunkte. */
	progress: number;
	completedAt: Date | null;
	bonusPoints: number;
	overtimePoints: number;
}

export function dayStatus(input: {
	date: LocalDate;
	today: LocalDate;
	scoringStart: LocalDate;
	complete: boolean;
	sick: boolean;
}): DayStatus {
	if (isWarmupDay(input.date)) return 'warmup';
	if (input.complete) return 'fulfilled';
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

/** Tagesübersicht eines Hunters vom ersten Aufwärmtag bis heute (höchstens bis zum letzten Challenge-Tag). */
export function buildTimeline(records: HunterRecords, today: LocalDate): DaySummary[] {
	const lastDay = today < CHALLENGE_END ? today : CHALLENGE_END;
	if (lastDay < WARMUP_START) return [];

	const setsByDate = groupByDate(records.sets);
	const sickByDate = groupByDate(records.sickNotes);
	const bonusByDate = groupByDate(records.bonusEntries);
	const timeline: DaySummary[] = [];

	for (let date = WARMUP_START; date <= lastDay; date = addDays(date, 1)) {
		const plan = planFor(records.plans, date);
		const sets = setsByDate.get(date) ?? [];
		const sickNotes = sickByDate.get(date) ?? [];
		const bonusEntries = bonusByDate.get(date) ?? [];
		const totals = totalsOf(sets);
		const complete = isQuestComplete(plan, totals);
		const status = dayStatus({
			date,
			today,
			scoringStart: records.scoringStart,
			complete,
			sick: sickNotes.length > 0
		});
		const dayEnd = endOfDay(date);
		const backfilled =
			status === 'sick'
				? sickNotes.some((note) => note.recordedAt >= dayEnd)
				: complete && (status === 'fulfilled' || status === 'warmup')
					? sets.some((entry) => entry.recordedAt >= dayEnd)
					: false;

		timeline.push({
			date,
			dayNumber: challengeDayNumber(date),
			status,
			backfilled,
			plan,
			totals,
			complete,
			progress: questProgress(plan, totals),
			completedAt: complete ? completionTime(plan, sets) : null,
			bonusPoints: bonusEntries.reduce((sum, entry) => sum + entry.bonusPoints, 0),
			overtimePoints: overtimeBonusPoints(plan, totals)
		});
	}
	return timeline;
}

export function fulfilledDays(timeline: readonly DaySummary[]): number {
	return timeline.filter((day) => day.status === 'fulfilled').length;
}

/** Bonuspunkte aller gewerteten Tage. Aufwärmtage zählen nicht. */
export function totalBonusPoints(timeline: readonly DaySummary[]): number {
	return timeline.reduce(
		(sum, day) => (day.status === 'warmup' ? sum : sum + day.bonusPoints + day.overtimePoints),
		0
	);
}

export interface ExerciseVolume {
	exerciseId: string;
	name: string;
	unit: PlanUnit;
	total: number;
}

export interface Volume {
	reps: number;
	minutes: number;
	km: number;
	/** Daily-Quest-Summen je Übung und Einheit, absteigend nach Menge. */
	byExercise: ExerciseVolume[];
}

/** Trainingsvolumen aus Daily Quest (alle Tage inklusive Aufwärmtage) und optional Zusatzübungen. */
export function volumeOf(timeline: readonly DaySummary[], bonusEntries: readonly BonusEntry[] = []): Volume {
	const volume: Volume = { reps: 0, minutes: 0, km: 0, byExercise: [] };
	const byKey = new Map<string, ExerciseVolume>();
	for (const day of timeline) {
		for (const item of day.plan) {
			const value = day.totals[item.exerciseId] ?? 0;
			if (value <= 0) continue;
			volume[item.unit] += value;
			const key = `${item.exerciseId}|${item.unit}`;
			const entry = byKey.get(key) ?? { exerciseId: item.exerciseId, name: item.name, unit: item.unit, total: 0 };
			entry.total += value;
			byKey.set(key, entry);
		}
	}
	for (const entry of bonusEntries) {
		volume.reps += entry.reps ?? 0;
		volume.minutes += entry.minutes ?? 0;
		volume.km += entry.distanceKm ?? 0;
	}
	volume.km = Math.round(volume.km * 10) / 10;
	volume.byExercise = [...byKey.values()].sort((a, b) => b.total - a.total);
	return volume;
}
