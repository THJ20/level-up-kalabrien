import { addDays, coachPrompt, mondayOf } from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { weekRating } from './progression';
import { hunterTimeline, storedPlanOn } from './records';
import { rotationOverview } from './rotation';

/**
 * Prompt für die eigene KI mit aktuellem Plan, Bewertung, Verlauf der letzten 14 Tage und eigenen Hinweisen.
 * Mit `focus` bittet er um 1 bis 2 Tausche für bisher wenig trainierte Muskelgruppen.
 */
export function planPrompt(ctx: ServiceContext, hunterId: string, notes: string, focus = false): string {
	const today = todayOf(ctx);
	const current = storedPlanOn(ctx, hunterId, today);
	const from = addDays(today, -14);
	const recent = hunterTimeline(ctx, hunterId).filter(
		(day) => day.date >= from && day.date < today && day.status !== 'warmup' && day.status !== 'unscored'
	);
	const rotation = focus ? rotationOverview(ctx, hunterId) : null;
	return coachPrompt({
		items: current?.items ?? [],
		rating: weekRating(ctx, hunterId, mondayOf(today)),
		notes,
		fulfilled: recent.filter((day) => day.status === 'fulfilled').length,
		scoredDays: recent.length,
		today,
		focus: rotation
			? { trained: rotation.trained.map((entry) => entry.label), suggested: rotation.focus.map((entry) => entry.label) }
			: undefined
	});
}
