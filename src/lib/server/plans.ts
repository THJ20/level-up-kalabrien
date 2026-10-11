import { and, eq, gt, inArray } from 'drizzle-orm';
import {
	CHALLENGE_END,
	WARMUP_START,
	addDays,
	defaultPlanItems,
	planError,
	planFor,
	roundToUnit,
	unitsFor,
	type LocalDate,
	type PlanItem,
	type PlanUnit,
	type PlanVersion
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { hunters, planItems, plans, questSets } from './db/schema';
import { invalid } from './errors';
import { appendEvent } from './feed';
import { createExercise, getExercise, type ExerciseInput } from './bonus';
import { getHunter } from './hunters';
import { applyHunterChange } from './pipeline';
import { loadPlanVersions } from './records';

/** Speichert eine Planversion. Selbst gespeicherte Pläne setzen die Grundlage der Steigerung neu. */
export function insertVersion(
	ctx: ServiceContext,
	hunterId: string,
	validFrom: LocalDate,
	items: readonly (Pick<PlanItem, 'exerciseId' | 'unit' | 'target'> & { baseTarget?: number })[],
	options: { isDefault?: boolean; auto?: boolean; factor?: number } = {}
): void {
	const id = crypto.randomUUID();
	ctx.db
		.insert(plans)
		.values({
			id,
			hunterId,
			validFrom,
			isDefault: options.isDefault ?? false,
			auto: options.auto ?? false,
			factor: options.factor ?? 1,
			createdAt: ctx.clock.now()
		})
		.run();
	ctx.db
		.insert(planItems)
		.values(
			items.map((item, position) => ({
				planId: id,
				position,
				exerciseId: item.exerciseId,
				unit: item.unit,
				target: item.target,
				baseTarget: item.baseTarget ?? item.target
			}))
		)
		.run();
}

/** Legt den Startplan an, wenn der Hunter noch keinen Plan hat. */
export function ensureStartPlan(ctx: ServiceContext, hunterId: string): void {
	const existing = ctx.db.select({ id: plans.id }).from(plans).where(eq(plans.hunterId, hunterId)).limit(1).get();
	if (existing) return;
	insertVersion(ctx, hunterId, WARMUP_START, defaultPlanItems(), { isDefault: true });
}

/** Startpläne für alle Hunter ohne Plan, z. B. nach einer Migration. */
export function ensureStartPlans(ctx: ServiceContext): void {
	for (const { id } of ctx.db.select({ id: hunters.id }).from(hunters).all()) ensureStartPlan(ctx, id);
}

function hasAnySet(ctx: ServiceContext, hunterId: string): boolean {
	return !!ctx.db.select({ id: questSets.id }).from(questSets).where(eq(questSets.hunterId, hunterId)).limit(1).get();
}

/** Ab wann ein jetzt gespeicherter Plan gilt: ab Beginn, solange noch nichts eingetragen ist, sonst ab morgen. */
export function nextPlanStart(ctx: ServiceContext, hunterId: string): LocalDate {
	return hasAnySet(ctx, hunterId) ? addDays(todayOf(ctx), 1) : WARMUP_START;
}

export interface PlanOverview {
	today: LocalDate;
	/** Plan, der heute gilt. */
	current: readonly PlanItem[];
	/** Gespeicherter Plan, der erst ab einem späteren Tag gilt. */
	upcoming: PlanVersion | null;
	/** Ab wann ein jetzt gespeicherter Plan gelten würde. */
	nextStart: LocalDate;
}

export function planOverview(ctx: ServiceContext, hunterId: string): PlanOverview {
	getHunter(ctx, hunterId);
	const today = todayOf(ctx);
	const versions = loadPlanVersions(ctx, hunterId);
	const upcoming = versions.filter((version) => version.validFrom > today).at(-1) ?? null;
	return { today, current: planFor(versions, today), upcoming, nextStart: nextPlanStart(ctx, hunterId) };
}

export interface PlanItemInput {
	/** Vorhandene Katalogübung … */
	exerciseId?: string;
	/** … oder eine neue, die im selben Schritt angelegt wird. */
	newExercise?: ExerciseInput;
	unit: PlanUnit;
	target: number;
}

/**
 * Speichert einen neuen Plan. Er gilt ab morgen, ein Plan für morgen wird überschrieben.
 * Solange der Hunter noch keinen Satz eingetragen hat, ersetzt er alle bisherigen Versionen ab Beginn.
 */
export function savePlan(ctx: ServiceContext, hunterId: string, input: readonly PlanItemInput[]): PlanOverview {
	getHunter(ctx, hunterId);
	const validFrom = nextPlanStart(ctx, hunterId);
	if (validFrom > CHALLENGE_END) throw invalid('Die Challenge ist vorbei, der Plan lässt sich nicht mehr ändern.');

	applyHunterChange(ctx, hunterId, () => {
		const items = input.map((entry) => {
			if (!entry.exerciseId && !entry.newExercise) throw invalid('Jeder Planpunkt braucht eine Übung.');
			const exercise = entry.exerciseId
				? getExercise(ctx, entry.exerciseId)
				: createExercise(ctx, hunterId, entry.newExercise as ExerciseInput);
			if (!unitsFor(exercise).includes(entry.unit)) {
				throw invalid(`Für „${exercise.name}“ passt diese Einheit nicht.`);
			}
			return { exerciseId: exercise.id, name: exercise.name, unit: entry.unit, target: roundToUnit(entry.unit, entry.target) };
		});
		const error = planError(items);
		if (error) throw invalid(error);

		if (validFrom === WARMUP_START) {
			const ids = ctx.db.select({ id: plans.id }).from(plans).where(eq(plans.hunterId, hunterId)).all();
			if (ids.length > 0) {
				ctx.db.delete(planItems).where(inArray(planItems.planId, ids.map((row) => row.id))).run();
				ctx.db.delete(plans).where(eq(plans.hunterId, hunterId)).run();
			}
		} else {
			const later = ctx.db
				.select({ id: plans.id })
				.from(plans)
				.where(and(eq(plans.hunterId, hunterId), gt(plans.validFrom, todayOf(ctx))))
				.all();
			if (later.length > 0) {
				ctx.db.delete(planItems).where(inArray(planItems.planId, later.map((row) => row.id))).run();
				ctx.db.delete(plans).where(inArray(plans.id, later.map((row) => row.id))).run();
			}
		}
		insertVersion(ctx, hunterId, validFrom, items);
		appendEvent(ctx, hunterId, 'plan_changed', {
			validFrom,
			items: items.map(({ name, unit, target }) => ({ name, unit, target }))
		});
	});
	return planOverview(ctx, hunterId);
}
