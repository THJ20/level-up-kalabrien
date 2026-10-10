import { and, eq } from 'drizzle-orm';
import {
	challengeDayNumber,
	daysUntilDeparture,
	fulfilledDays,
	isLocalDate,
	levelProgress,
	streaks,
	totalBonusPoints,
	volumeOf,
	type DayStatus,
	type DaySummary,
	type LevelProgress,
	type LocalDate,
	type PlanUnit,
	type Rank,
	type StreakInfo,
	type Volume
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { sickNotes } from './db/schema';
import { invalid } from './errors';
import { listHunterBadges } from './badges';
import { listBonusEntries, type BonusEntryView } from './bonus';
import { getHunter, listActiveHunters, toRef, type HunterProfile, type HunterRef } from './hunters';
import { planOverview, type PlanOverview } from './plans';
import { listSets, type QuestSetView } from './quest';
import { hunterTimeline, loadBonusEntries } from './records';
import { listVerdicts, openVotesAwaiting, type VerdictView } from './votes';

export interface HunterSummary {
	hunter: HunterProfile;
	today: LocalDate;
	dayNumber: number | null;
	daysUntilDeparture: number;
	day: DaySummary | null;
	level: LevelProgress;
	streak: StreakInfo;
	bonusPoints: number;
	badges: { badgeId: string; earnedAt: Date }[];
	openVotesForMe: number;
}

export interface BoardRow {
	hunter: HunterRef;
	status: DayStatus | null;
	/** Tagesfortschritt 0 bis 1. */
	progress: number;
}

export interface LeaderboardRow {
	hunter: HunterRef;
	level: number;
	rank: Rank;
	quests: number;
	bonusPoints: number;
	periodBonusPoints: number;
	streak: StreakInfo;
	missedDays: number;
	sickDays: number;
}

export interface StatsDay {
	date: LocalDate;
	status: DayStatus;
	/** Planerfüllung 0 bis 1. */
	progress: number;
	reps: number;
	minutes: number;
	km: number;
	/** Daily-Quest-Wert je Übung, Schlüssel `übungs-id:einheit`. */
	byExercise: Record<string, number>;
	bonusPoints: number;
	overtimePoints: number;
}

export interface StatsExercise {
	key: string;
	name: string;
	unit: PlanUnit;
}

export interface StatsSeries {
	hunter: HunterRef;
	days: StatsDay[];
	exercises: StatsExercise[];
}

export function hunterSummary(ctx: ServiceContext, hunterId: string): HunterSummary {
	const hunter = getHunter(ctx, hunterId);
	const today = todayOf(ctx);
	const timeline = hunterTimeline(ctx, hunterId, today);
	return {
		hunter,
		today,
		dayNumber: challengeDayNumber(today),
		daysUntilDeparture: daysUntilDeparture(today),
		day: timeline.find((day) => day.date === today) ?? null,
		level: levelProgress(fulfilledDays(timeline)),
		streak: streaks(timeline),
		bonusPoints: totalBonusPoints(timeline),
		badges: listHunterBadges(ctx, hunterId),
		openVotesForMe: openVotesAwaiting(ctx, hunterId).length
	};
}

export function todayBoard(ctx: ServiceContext): BoardRow[] {
	const today = todayOf(ctx);
	return listActiveHunters(ctx).map((hunter) => {
		const day = hunterTimeline(ctx, hunter.id, today).find((entry) => entry.date === today);
		return { hunter: toRef(hunter), status: day?.status ?? null, progress: day?.progress ?? 0 };
	});
}

function inRange(date: LocalDate, from?: LocalDate, to?: LocalDate): boolean {
	return (from === undefined || date >= from) && (to === undefined || date <= to);
}

export function leaderboard(
	ctx: ServiceContext,
	range: { from?: LocalDate; to?: LocalDate } = {}
): { overall: LeaderboardRow[]; bonus: LeaderboardRow[]; streaks: LeaderboardRow[] } {
	const rows = listActiveHunters(ctx).map((hunter): LeaderboardRow => {
		const timeline = hunterTimeline(ctx, hunter.id);
		const level = levelProgress(fulfilledDays(timeline));
		return {
			hunter: toRef(hunter),
			level: level.level,
			rank: level.rank,
			quests: level.quests,
			bonusPoints: totalBonusPoints(timeline),
			periodBonusPoints: totalBonusPoints(timeline.filter((day) => inRange(day.date, range.from, range.to))),
			streak: streaks(timeline),
			missedDays: timeline.filter((day) => day.status === 'missed').length,
			sickDays: timeline.filter((day) => day.status === 'sick').length
		};
	});
	const byName = (a: LeaderboardRow, b: LeaderboardRow) => a.hunter.name.localeCompare(b.hunter.name, 'de');
	return {
		overall: [...rows].sort((a, b) => b.level - a.level || b.bonusPoints - a.bonusPoints || byName(a, b)),
		bonus: [...rows].sort(
			(a, b) => b.periodBonusPoints - a.periodBonusPoints || b.level - a.level || byName(a, b)
		),
		streaks: [...rows].sort(
			(a, b) =>
				b.streak.current - a.streak.current || b.streak.longest - a.streak.longest || byName(a, b)
		)
	};
}

export interface HunterProfileView {
	summary: HunterSummary;
	timeline: DaySummary[];
	volume: Volume;
	plan: Pick<PlanOverview, 'current' | 'upcoming'>;
	verdicts: VerdictView[];
}

export function hunterProfile(ctx: ServiceContext, hunterId: string): HunterProfileView {
	const timeline = hunterTimeline(ctx, hunterId);
	const plan = planOverview(ctx, hunterId);
	return {
		summary: hunterSummary(ctx, hunterId),
		timeline,
		volume: volumeOf(timeline, loadBonusEntries(ctx, hunterId)),
		plan: { current: plan.current, upcoming: plan.upcoming },
		verdicts: listVerdicts(ctx, { hunterId })
	};
}

export function dayDetail(
	ctx: ServiceContext,
	hunterId: string,
	date: LocalDate
): { day: DaySummary | null; sets: QuestSetView[]; sickReportedAt: Date | null; bonus: BonusEntryView[] } {
	if (!isLocalDate(date)) throw invalid('Ungültiges Datum.');
	getHunter(ctx, hunterId);
	const sick = ctx.db
		.select({ recordedAt: sickNotes.recordedAt })
		.from(sickNotes)
		.where(and(eq(sickNotes.hunterId, hunterId), eq(sickNotes.date, date)))
		.get();
	return {
		day: hunterTimeline(ctx, hunterId).find((day) => day.date === date) ?? null,
		sets: listSets(ctx, hunterId, date),
		sickReportedAt: sick?.recordedAt ?? null,
		bonus: listBonusEntries(ctx, hunterId, date)
	};
}

function toStatsDay(day: DaySummary, exercises: Map<string, StatsExercise>): StatsDay {
	const stats: StatsDay = {
		date: day.date,
		status: day.status,
		progress: day.progress,
		reps: 0,
		minutes: 0,
		km: 0,
		byExercise: {},
		bonusPoints: day.status === 'warmup' ? 0 : day.bonusPoints,
		overtimePoints: day.status === 'warmup' ? 0 : day.overtimePoints
	};
	for (const item of day.plan) {
		const value = day.totals[item.exerciseId] ?? 0;
		const key = `${item.exerciseId}:${item.unit}`;
		if (!exercises.has(key)) exercises.set(key, { key, name: item.name, unit: item.unit });
		if (value <= 0) continue;
		stats[item.unit] += value;
		stats.byExercise[key] = value;
	}
	stats.km = Math.round(stats.km * 10) / 10;
	return stats;
}

export function stats(
	ctx: ServiceContext,
	query: { hunterIds?: string[]; from: LocalDate; to: LocalDate }
): StatsSeries[] {
	if (!isLocalDate(query.from) || !isLocalDate(query.to) || query.from > query.to) {
		throw invalid('Der Zeitraum ist ungültig.');
	}
	const wanted = query.hunterIds ? new Set(query.hunterIds) : null;
	return listActiveHunters(ctx)
		.filter((hunter) => wanted === null || wanted.has(hunter.id))
		.map((hunter) => {
			const exercises = new Map<string, StatsExercise>();
			const days = hunterTimeline(ctx, hunter.id)
				.filter((day) => inRange(day.date, query.from, query.to))
				.map((day) => toStatsDay(day, exercises));
			return { hunter: toRef(hunter), days, exercises: [...exercises.values()] };
		});
}
