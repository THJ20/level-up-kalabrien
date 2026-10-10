import { and, asc, count, eq, inArray } from 'drizzle-orm';
import {
	buildTimeline,
	planFor,
	type BonusEntry,
	type DaySummary,
	type HunterRecords,
	type LocalDate,
	type PlanItem,
	type PlanVersion
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { bonusEntries, exercises, planItems, plans, questSets, sickNotes } from './db/schema';
import { getHunter, scoringStartOf } from './hunters';

/** Alle Planversionen eines Hunters mit Übungsnamen, älteste zuerst. */
export function loadPlanVersions(ctx: ServiceContext, hunterId: string): PlanVersion[] {
	const versions = ctx.db
		.select()
		.from(plans)
		.where(eq(plans.hunterId, hunterId))
		.orderBy(asc(plans.validFrom))
		.all();
	if (versions.length === 0) return [];
	const rows = ctx.db
		.select({ item: planItems, exercise: exercises })
		.from(planItems)
		.innerJoin(exercises, eq(planItems.exerciseId, exercises.id))
		.where(
			inArray(
				planItems.planId,
				versions.map((version) => version.id)
			)
		)
		.orderBy(asc(planItems.position))
		.all();
	return versions.map((version) => ({
		validFrom: version.validFrom,
		items: rows
			.filter((row) => row.item.planId === version.id)
			.map(
				({ item, exercise }): PlanItem => ({
					exerciseId: exercise.id,
					name: exercise.name,
					unit: item.unit,
					target: item.target,
					secondsPerRep: exercise.secondsPerRep
				})
			)
	}));
}

/** Wie oft der Hunter selbst einen Plan gespeichert hat (für den Badge Architekt). */
export function planSaveCount(ctx: ServiceContext, hunterId: string): number {
	return (
		ctx.db
			.select({ value: count() })
			.from(plans)
			.where(and(eq(plans.hunterId, hunterId), eq(plans.isDefault, false)))
			.get()?.value ?? 0
	);
}

/** Plan, der an einem Tag für den Hunter gilt. */
export function planOn(ctx: ServiceContext, hunterId: string, date: LocalDate): readonly PlanItem[] {
	return planFor(loadPlanVersions(ctx, hunterId), date);
}

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
			exerciseId: row.exerciseId,
			value: row.value,
			recordedAt: row.recordedAt
		}));
	const sick = ctx.db
		.select({ date: sickNotes.date, recordedAt: sickNotes.recordedAt })
		.from(sickNotes)
		.where(eq(sickNotes.hunterId, hunterId))
		.all();
	return {
		scoringStart: scoringStartOf(ctx, hunter),
		plans: loadPlanVersions(ctx, hunterId),
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
			minutes: entry.minutes,
			reps: entry.reps,
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
