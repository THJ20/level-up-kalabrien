import { and, eq } from 'drizzle-orm';
import {
	MUSCLE_GROUP_LABELS,
	libraryEntry,
	mondayOf,
	planFor,
	suggestRotation,
	type LocalDate,
	type MuscleGroup,
	type PlanUnit
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { planRotations, plans } from './db/schema';
import { invalid } from './errors';
import { listExercises } from './bonus';
import { getHunter } from './hunters';
import { nextPlanStart, savePlan, type PlanItemInput } from './plans';
import { FIRST_PROGRESSION, previewNextWeek, rotationDecision, type RotationDecision } from './progression';
import { loadPlanVersions } from './records';

export type { RotationDecision };

export interface RotationOverview {
	/** Entscheidung dieser Woche oder null. */
	decision: RotationDecision | null;
	trained: { group: MuscleGroup; label: string }[];
	focus: { group: MuscleGroup; label: string }[];
	swaps: {
		replace: { exerciseId: string; name: string; unit: PlanUnit; target: number };
		with: { name: string; unit: PlanUnit; target: number; groups: string[] };
		group: string;
	}[];
	/** Ab wann ein übernommener Tausch gilt. */
	effectiveFrom: LocalDate;
}

function labelled(groups: readonly MuscleGroup[]) {
	return groups.map((group) => ({ group, label: MUSCLE_GROUP_LABELS[group] }));
}

function record(ctx: ServiceContext, hunterId: string, decision: RotationDecision): void {
	const weekStart = mondayOf(todayOf(ctx));
	ctx.db
		.insert(planRotations)
		.values({ hunterId, weekStart, decision, createdAt: ctx.clock.now() })
		.onConflictDoUpdate({
			target: [planRotations.hunterId, planRotations.weekStart],
			set: { decision, createdAt: ctx.clock.now() }
		})
		.run();
}

/** Der Plan, der ab dem nächsten möglichen Tag gelten würde, und ältere Pläne, neueste zuerst. */
function basis(ctx: ServiceContext, hunterId: string) {
	const effectiveFrom = nextPlanStart(ctx, hunterId);
	const versions = loadPlanVersions(ctx, hunterId);
	const reference = effectiveFrom > todayOf(ctx) ? effectiveFrom : todayOf(ctx);
	const current = planFor(versions, reference);
	const history = versions
		.filter((version) => version.validFrom < reference && version.items !== current)
		.reverse()
		.map((version) => version.items);
	return { effectiveFrom, current, history };
}

export function rotationOverview(ctx: ServiceContext, hunterId: string): RotationOverview {
	getHunter(ctx, hunterId);
	const { effectiveFrom, current, history } = basis(ctx, hunterId);
	const suggestion = suggestRotation({ current, history });
	return {
		decision: rotationDecision(ctx, hunterId, mondayOf(todayOf(ctx))),
		trained: labelled(suggestion.trained),
		focus: labelled(suggestion.focus),
		swaps: suggestion.swaps.map((swap) => ({
			replace: {
				exerciseId: swap.replace.exerciseId,
				name: swap.replace.name,
				unit: swap.replace.unit,
				target: swap.replace.target
			},
			with: {
				name: swap.with.name,
				unit: swap.with.unit,
				target: swap.with.target,
				groups: swap.with.groups.map((group) => MUSCLE_GROUP_LABELS[group])
			},
			group: MUSCLE_GROUP_LABELS[swap.group]
		})),
		effectiveFrom
	};
}

/**
 * Übernimmt die gewählten Tausche (Index in den Vorschlägen) oder lehnt ab, wenn keiner gewählt ist.
 * Gilt der neue Plan ab einem Montag, steigen die übrigen Übungen wie bei der automatischen Steigerung mit.
 */
export function applyRotation(ctx: ServiceContext, hunterId: string, accepted: readonly number[]): RotationOverview {
	const overview = rotationOverview(ctx, hunterId);
	if (accepted.length === 0) {
		record(ctx, hunterId, 'declined');
		return rotationOverview(ctx, hunterId);
	}
	if (accepted.some((index) => !Number.isInteger(index) || index < 0 || index >= overview.swaps.length)) {
		throw invalid('Diesen Vorschlag gibt es nicht mehr. Lade die Seite neu.');
	}

	const { effectiveFrom, current } = basis(ctx, hunterId);
	const kept = new Map(current.map((item) => [item.exerciseId, item.target]));
	const isWeekStart = mondayOf(effectiveFrom) === effectiveFrom && effectiveFrom >= FIRST_PROGRESSION;
	const manualForThatDay = ctx.db
		.select({ id: plans.id })
		.from(plans)
		.where(and(eq(plans.hunterId, hunterId), eq(plans.validFrom, effectiveFrom), eq(plans.auto, false)))
		.get();
	if (isWeekStart && !manualForThatDay) {
		previewNextWeek(ctx, hunterId).result?.items.forEach((item) => kept.set(item.exerciseId, item.target));
	}

	const catalog = listExercises(ctx);
	const chosen = new Map(accepted.map((index) => [overview.swaps[index].replace.exerciseId, overview.swaps[index]]));
	const items: PlanItemInput[] = current.map((item) => {
		const swap = chosen.get(item.exerciseId);
		if (!swap) return { exerciseId: item.exerciseId, unit: item.unit, target: kept.get(item.exerciseId) ?? item.target };
		const library = libraryEntry(swap.with.name);
		const existing = catalog.find((exercise) => libraryEntry(exercise.name)?.name === library?.name);
		if (existing) return { exerciseId: existing.id, unit: swap.with.unit, target: swap.with.target };
		return {
			newExercise: {
				name: swap.with.name,
				kind: library?.kind ?? 'reps',
				secondsPerRep: library?.secondsPerRep ?? null,
				tracksDistance: library?.tracksDistance ?? false
			},
			unit: swap.with.unit,
			target: swap.with.target
		};
	});
	savePlan(ctx, hunterId, items);
	record(ctx, hunterId, 'accepted');
	return rotationOverview(ctx, hunterId);
}
