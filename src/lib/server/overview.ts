import { and, eq } from 'drizzle-orm';
import {
	EXERCISES,
	QUEST_TARGET,
	challengeDayNumber,
	daysUntilDeparture,
	fulfilledDays,
	isLocalDate,
	levelProgress,
	streaks,
	totalBonusPoints,
	volumeTotals,
	type DayStatus,
	type DaySummary,
	type ExerciseTotals,
	type LevelProgress,
	type LocalDate,
	type Rank,
	type StreakInfo
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { sickNotes } from './db/schema';
import { invalid } from './errors';
import { listHunterBadges } from './badges';
import { listBonusEntries, type BonusEntryView } from './bonus';
import { getHunter, listActiveHunters, toRef, type HunterProfile, type HunterRef } from './hunters';
import { listSets, type QuestSetRow } from './quest';
import { hunterTimeline } from './records';
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
	totals: ExerciseTotals;
	/** Summe der auf 100 gekappten Wiederholungen, 0 bis 300. */
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
	totals: ExerciseTotals;
	bonusPoints: number;
	overtimePoints: number;
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

function cappedProgress(totals: ExerciseTotals): number {
	return EXERCISES.reduce((sum, exercise) => sum + Math.min(totals[exercise], QUEST_TARGET), 0);
}

export function todayBoard(ctx: ServiceContext): BoardRow[] {
	const today = todayOf(ctx);
	return listActiveHunters(ctx).map((hunter) => {
		const day = hunterTimeline(ctx, hunter.id, today).find((entry) => entry.date === today);
		const totals = day?.totals ?? { pushups: 0, squats: 0, situps: 0 };
		return { hunter: toRef(hunter), status: day?.status ?? null, totals, progress: cappedProgress(totals) };
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

export function hunterProfile(
	ctx: ServiceContext,
	hunterId: string
): { summary: HunterSummary; timeline: DaySummary[]; volume: ExerciseTotals; verdicts: VerdictView[] } {
	const timeline = hunterTimeline(ctx, hunterId);
	return {
		summary: hunterSummary(ctx, hunterId),
		timeline,
		volume: volumeTotals(timeline),
		verdicts: listVerdicts(ctx, { hunterId })
	};
}

export function dayDetail(
	ctx: ServiceContext,
	hunterId: string,
	date: LocalDate
): { day: DaySummary | null; sets: QuestSetRow[]; sickReportedAt: Date | null; bonus: BonusEntryView[] } {
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

export function stats(
	ctx: ServiceContext,
	query: { hunterIds?: string[]; from: LocalDate; to: LocalDate }
): { hunter: HunterRef; days: StatsDay[] }[] {
	if (!isLocalDate(query.from) || !isLocalDate(query.to) || query.from > query.to) {
		throw invalid('Der Zeitraum ist ungültig.');
	}
	const wanted = query.hunterIds ? new Set(query.hunterIds) : null;
	return listActiveHunters(ctx)
		.filter((hunter) => wanted === null || wanted.has(hunter.id))
		.map((hunter) => ({
			hunter: toRef(hunter),
			days: hunterTimeline(ctx, hunter.id)
				.filter((day) => inRange(day.date, query.from, query.to))
				.map((day) => ({
					date: day.date,
					status: day.status,
					totals: day.totals,
					bonusPoints: day.bonusPoints,
					overtimePoints: day.overtimePoints
				}))
		}));
}
