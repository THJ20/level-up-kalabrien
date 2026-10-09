import { asc, eq } from 'drizzle-orm';
import {
	buildTimeline,
	type BonusEntry,
	type DaySummary,
	type HunterRecords,
	type LocalDate
} from '$lib/domain';
import { todayOf, type ServiceContext } from './context';
import { bonusEntries, exercises, questSets, sickNotes } from './db/schema';
import { getHunter, scoringStartOf } from './hunters';

/** Rohdaten eines Hunters im Format des Domänenmoduls. */
export function loadHunterRecords(ctx: ServiceContext, hunterId: string): HunterRecords {
	const hunter = getHunter(ctx, hunterId);
	const sets = ctx.db
		.select()
		.from(questSets)
		.where(eq(questSets.hunterId, hunterId))
		.orderBy(asc(questSets.recordedAt))
		.all()
		.map((row) => ({
			id: row.id,
			date: row.date,
			exercise: row.exercise,
			reps: row.reps,
			recordedAt: row.recordedAt
		}));
	const sick = ctx.db
		.select({ date: sickNotes.date, recordedAt: sickNotes.recordedAt })
		.from(sickNotes)
		.where(eq(sickNotes.hunterId, hunterId))
		.all();
	return {
		scoringStart: scoringStartOf(ctx, hunter),
		sets,
		sickNotes: sick,
		bonusEntries: loadBonusEntries(ctx, hunterId)
	};
}

export function loadBonusEntries(ctx: ServiceContext, hunterId: string): BonusEntry[] {
	return ctx.db
		.select({ entry: bonusEntries, isRunning: exercises.isRunning })
		.from(bonusEntries)
		.innerJoin(exercises, eq(bonusEntries.exerciseId, exercises.id))
		.where(eq(bonusEntries.hunterId, hunterId))
		.all()
		.map(({ entry, isRunning }) => ({
			id: entry.id,
			date: entry.date,
			bonusPoints: entry.bonusPoints,
			distanceKm: entry.distanceKm,
			isRunning,
			recordedAt: entry.recordedAt
		}));
}

export function hunterTimeline(
	ctx: ServiceContext,
	hunterId: string,
	today: LocalDate = todayOf(ctx)
): DaySummary[] {
	return buildTimeline(loadHunterRecords(ctx, hunterId), today);
}
