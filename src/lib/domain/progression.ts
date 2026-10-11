import { TARGET_LIMITS, roundToUnit, type PlanItem } from './plan';

/** Wie sich der Plan in der Woche angefühlt hat. Nur der Hunter selbst sieht seine Bewertung. */
export const RATINGS = ['too_easy', 'right', 'too_hard'] as const;
export type Rating = (typeof RATINGS)[number];

export const RATING_LABELS: Record<Rating, string> = {
	too_easy: 'Zu leicht',
	right: 'Passend',
	too_hard: 'Zu schwer'
};

/** Änderung der Ziele zum nächsten Montag je nach Bewertung. Ohne Bewertung gilt „passend“. */
export const RATING_STEP: Record<Rating, number> = { too_easy: 0.1, right: 0.05, too_hard: -0.1 };

/** Ab dieser geschätzten Dauer pro Tag wird nicht weiter gesteigert. */
export const TIME_CAP_MINUTES = 30;
/** So viele erfüllte Tage braucht eine Woche, damit der Plan danach schwerer wird. */
export const MIN_FULFILLED_FOR_STEP = 5;
/** Grobe Annahmen für die Schätzung: Sekunden pro Wiederholung, wenn die Übung keine hat, und Laufpace. */
export const DEFAULT_SECONDS_PER_REP = 3;
export const MINUTES_PER_KM = 6;
/** Untergrenze für den Faktor, damit „zu schwer“ den Plan nicht beliebig schrumpfen lässt. */
export const MIN_FACTOR = 0.5;

/** Planpunkt mit dem Ziel, das beim letzten selbst gespeicherten Plan galt. */
export interface ProgressionItem extends PlanItem {
	baseTarget: number;
}

/** Geschätzte reine Trainingszeit eines Plans pro Tag in Minuten. */
export function estimateMinutes(items: readonly PlanItem[]): number {
	return items.reduce((sum, item) => {
		if (item.unit === 'minutes') return sum + item.target;
		if (item.unit === 'km') return sum + item.target * MINUTES_PER_KM;
		return sum + (item.target * (item.secondsPerRep ?? DEFAULT_SECONDS_PER_REP)) / 60;
	}, 0);
}

export type ProgressionReason = 'step' | 'reduced' | 'weak_week' | 'capped';

export interface ProgressionResult {
	reason: ProgressionReason;
	/** Angewendete Änderung, z. B. 0,05 für +5 %. 0 bei schwacher Woche oder Zeitlimit. */
	step: number;
	factor: number;
	items: ProgressionItem[];
	/** Ob sich mindestens ein Ziel ändert. */
	changed: boolean;
}

function scaled(items: readonly ProgressionItem[], factor: number): ProgressionItem[] {
	return items.map((item) => {
		const limits = TARGET_LIMITS[item.unit];
		const target = roundToUnit(item.unit, item.baseTarget * factor);
		return { ...item, target: Math.min(limits.max, Math.max(limits.min, target)) };
	});
}

/**
 * Plan für die neue Woche. Der Faktor wirkt auf die Ziele des letzten selbst gespeicherten Plans,
 * damit sich auch kleine Ziele wie 3 Minuten über die Wochen spürbar steigern.
 */
export function nextProgression(input: {
	items: readonly ProgressionItem[];
	factor: number;
	rating: Rating | null;
	fulfilledLastWeek: number;
}): ProgressionResult {
	const unchanged = (reason: ProgressionReason): ProgressionResult => ({
		reason,
		step: 0,
		factor: input.factor,
		items: input.items.map((item) => ({ ...item })),
		changed: false
	});

	const step = RATING_STEP[input.rating ?? 'right'];
	if (step > 0 && input.fulfilledLastWeek < MIN_FULFILLED_FOR_STEP) return unchanged('weak_week');

	const factor = Math.max(MIN_FACTOR, Math.round(input.factor * (1 + step) * 10_000) / 10_000);
	const items = scaled(input.items, factor);
	if (step > 0 && estimateMinutes(items) > TIME_CAP_MINUTES) return unchanged('capped');

	return {
		reason: step < 0 ? 'reduced' : 'step',
		step,
		factor,
		items,
		changed: items.some((item, index) => item.target !== input.items[index].target)
	};
}
