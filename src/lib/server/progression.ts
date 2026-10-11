import { and, eq } from 'drizzle-orm';
import {
	CHALLENGE_END,
	CHALLENGE_START,
	MIN_FULFILLED_FOR_STEP,
	RATINGS,
	RATING_STEP,
	addDays,
	coachPrompt,
	daysBetween,
	mondayOf,
	nextProgression,
	type LocalDate,
	type ProgressionReason,
	type Rating
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { planRatings, plans } from './db/schema';
import { invalid } from './errors';
import { getHunter, listActiveHunters } from './hunters';
import { applyHunterChange } from './pipeline';
import { insertVersion } from './plans';
import { hunterTimeline, storedPlanOn } from './records';

/** Erster Montag, an dem gesteigert wird: eine Woche nach dem Start. */
export const FIRST_PROGRESSION = addDays(CHALLENGE_START, 7);

function fulfilledBetween(ctx: ServiceContext, hunterId: string, from: LocalDate, to: LocalDate): number {
	return hunterTimeline(ctx, hunterId).filter((day) => day.date >= from && day.date <= to && day.status === 'fulfilled')
		.length;
}

export function weekRating(ctx: ServiceContext, hunterId: string, weekStart: LocalDate): Rating | null {
	return (
		ctx.db
			.select({ rating: planRatings.rating })
			.from(planRatings)
			.where(and(eq(planRatings.hunterId, hunterId), eq(planRatings.weekStart, weekStart)))
			.get()?.rating ?? null
	);
}

/** Bewertet die laufende Woche. Eine neue Bewertung ersetzt die alte. */
export function rateWeek(ctx: ServiceContext, hunterId: string, rating: Rating): ProgressionOverview {
	getHunter(ctx, hunterId);
	if (!(RATINGS as readonly string[]).includes(rating)) throw invalid('Diese Bewertung gibt es nicht.');
	const weekStart = mondayOf(todayOf(ctx));
	ctx.db
		.insert(planRatings)
		.values({ hunterId, weekStart, rating, createdAt: ctx.clock.now() })
		.onConflictDoUpdate({
			target: [planRatings.hunterId, planRatings.weekStart],
			set: { rating, createdAt: ctx.clock.now() }
		})
		.run();
	return progressionOverview(ctx, hunterId);
}

/**
 * Montags um Mitternacht: neuer Plan für jeden Hunter nach Bewertung der Vorwoche.
 * Übersprungen wird, wer für diesen Montag schon einen Plan hat (selbst gespeichert oder schon gesteigert).
 */
export function applyWeeklyProgression(ctx: ServiceContext): string[] {
	const monday = todayOf(ctx);
	if (mondayOf(monday) !== monday || monday < FIRST_PROGRESSION || monday > CHALLENGE_END) return [];
	const changed: string[] = [];
	for (const hunter of listActiveHunters(ctx)) {
		const exists = ctx.db
			.select({ id: plans.id })
			.from(plans)
			.where(and(eq(plans.hunterId, hunter.id), eq(plans.validFrom, monday)))
			.get();
		const current = storedPlanOn(ctx, hunter.id, monday);
		if (exists || !current) continue;
		const result = nextProgression({
			items: current.items,
			factor: current.factor,
			rating: weekRating(ctx, hunter.id, addDays(monday, -7)),
			fulfilledLastWeek: fulfilledBetween(ctx, hunter.id, addDays(monday, -7), addDays(monday, -1))
		});
		if (!result.changed && result.factor === current.factor) continue;
		applyHunterChange(ctx, hunter.id, () =>
			insertVersion(ctx, hunter.id, monday, result.items, { auto: true, factor: result.factor })
		);
		if (result.changed) changed.push(hunter.id);
	}
	return changed;
}

export interface ProgressionOverview {
	/** Montag der laufenden Woche und eigene Bewertung dafür. */
	weekStart: LocalDate;
	rating: Rating | null;
	/** Montag, an dem die nächste Steigerung greift, oder null nach dem Ende. */
	nextMonday: LocalDate | null;
	/** Was am nächsten Montag voraussichtlich passiert. */
	preview: { reason: ProgressionReason; step: number };
	fulfilledThisWeek: number;
	neededPerWeek: number;
	/** Sonntag und noch nicht bewertet: Check-in anzeigen. */
	checkinDue: boolean;
	/** Der Plan liegt am Zeitlimit, mehr Wiederholungen bringen nichts mehr. */
	capped: boolean;
}

export function progressionOverview(ctx: ServiceContext, hunterId: string): ProgressionOverview {
	const today = todayOf(ctx);
	const weekStart = mondayOf(today);
	const nextMonday = addDays(weekStart, 7);
	const rating = weekRating(ctx, hunterId, weekStart);
	const sunday = addDays(weekStart, 6);
	const timeline = hunterTimeline(ctx, hunterId);
	const fulfilledThisWeek = timeline.filter(
		(day) => day.date >= weekStart && day.date <= today && day.status === 'fulfilled'
	).length;
	const todayDone = timeline.find((day) => day.date === today)?.status === 'fulfilled';
	// Vorschau unter der Annahme, dass der Rest der Woche erfüllt wird.
	const bestCase = fulfilledThisWeek + daysBetween(today, sunday) + (todayDone ? 0 : 1);
	const current = storedPlanOn(ctx, hunterId, today);
	const preview = current
		? nextProgression({ items: current.items, factor: current.factor, rating, fulfilledLastWeek: bestCase })
		: null;
	const nextStep = current
		? nextProgression({ items: current.items, factor: current.factor, rating: 'right', fulfilledLastWeek: 7 })
		: null;
	return {
		weekStart,
		rating,
		nextMonday: nextMonday <= CHALLENGE_END && nextMonday >= FIRST_PROGRESSION ? nextMonday : null,
		preview: preview ? { reason: preview.reason, step: preview.step } : { reason: 'step', step: RATING_STEP.right },
		fulfilledThisWeek,
		neededPerWeek: MIN_FULFILLED_FOR_STEP,
		checkinDue: today === sunday && today >= CHALLENGE_START && sunday < CHALLENGE_END && rating === null,
		capped: nextStep?.reason === 'capped'
	};
}

/** Hinweis „Quest upgraded“, wenn heute eine automatisch gesteigerte Version beginnt. */
export function upgradeNotice(ctx: ServiceContext, hunterId: string): { validFrom: LocalDate; step: number } | null {
	const today = todayOf(ctx);
	const current = storedPlanOn(ctx, hunterId, today);
	if (!current || !current.auto || current.validFrom !== today) return null;
	const previous = storedPlanOn(ctx, hunterId, addDays(today, -1));
	if (!previous) return null;
	const changed = current.items.some((item, index) => item.target !== previous.items[index]?.target);
	if (!changed) return null;
	return { validFrom: today, step: Math.round((current.factor / previous.factor - 1) * 100) / 100 };
}

/** Prompt für die eigene KI mit aktuellem Plan, Bewertung und Verlauf der letzten 14 Tage. */
export function planPrompt(ctx: ServiceContext, hunterId: string, notes: string): string {
	const today = todayOf(ctx);
	const current = storedPlanOn(ctx, hunterId, today);
	const from = addDays(today, -14);
	const recent = hunterTimeline(ctx, hunterId).filter(
		(day) => day.date >= from && day.date < today && day.status !== 'warmup' && day.status !== 'unscored'
	);
	return coachPrompt({
		items: current?.items ?? [],
		rating: weekRating(ctx, hunterId, mondayOf(today)),
		notes,
		fulfilled: recent.filter((day) => day.status === 'fulfilled').length,
		scoredDays: recent.length,
		today
	});
}
