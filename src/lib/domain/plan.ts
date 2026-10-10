import { WARMUP_START, type LocalDate } from './challenge';

export const PLAN_UNITS = ['reps', 'minutes', 'km'] as const;
export type PlanUnit = (typeof PLAN_UNITS)[number];

export const UNIT_LABELS: Record<PlanUnit, { short: string; long: string }> = {
	reps: { short: 'Wdh.', long: 'Wiederholungen' },
	minutes: { short: 'Min.', long: 'Minuten' },
	km: { short: 'km', long: 'Kilometer' }
};

/** Ein Punkt im Trainingsplan: Übung aus dem Katalog mit Tagesziel. */
export interface PlanItem {
	exerciseId: string;
	name: string;
	unit: PlanUnit;
	target: number;
	/** Für Mehrleistung bei Wiederholungs-Übungen, sonst null. */
	secondsPerRep: number | null;
}

/** Plan, der ab `validFrom` jeden Tag gilt, bis eine neuere Version beginnt. */
export interface PlanVersion {
	validFrom: LocalDate;
	items: readonly PlanItem[];
}

export const MAX_PLAN_ITEMS = 12;

interface Limits {
	min: number;
	max: number;
	decimals: number;
}

/** Grenzen für das Tagesziel eines Planpunkts. */
export const TARGET_LIMITS: Record<PlanUnit, Limits> = {
	reps: { min: 1, max: 1000, decimals: 0 },
	minutes: { min: 1, max: 600, decimals: 0 },
	km: { min: 0.1, max: 100, decimals: 1 }
};

/** Grenzen für einen einzelnen Satz. */
export const SET_LIMITS: Record<PlanUnit, Limits> = {
	reps: { min: 1, max: 500, decimals: 0 },
	minutes: { min: 1, max: 600, decimals: 0 },
	km: { min: 0.1, max: 100, decimals: 1 }
};

const EPSILON = 1e-9;

function fits(value: number, limits: Limits): boolean {
	if (!Number.isFinite(value) || value < limits.min - EPSILON || value > limits.max + EPSILON) return false;
	const scaled = value * 10 ** limits.decimals;
	return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

export function isValidTarget(unit: PlanUnit, value: number): boolean {
	return fits(value, TARGET_LIMITS[unit]);
}

export function isValidSetValue(unit: PlanUnit, value: number): boolean {
	return fits(value, SET_LIMITS[unit]);
}

/** Rundet auf die Genauigkeit der Einheit, damit sich Kommafehler nicht aufsummieren. */
export function roundToUnit(unit: PlanUnit, value: number): number {
	const factor = 10 ** TARGET_LIMITS[unit].decimals;
	return Math.round(value * factor) / factor;
}

/** Kernübungen mit festen IDs. Sie bilden den Startplan. */
export const CORE_EXERCISES = [
	{ id: 'pushups', name: 'Liegestütze', secondsPerRep: 3 },
	{ id: 'squats', name: 'Kniebeugen', secondsPerRep: 3 },
	{ id: 'situps', name: 'Sit-ups/Crunches', secondsPerRep: 3 }
] as const;

export const DEFAULT_TARGET = 100;

export function defaultPlanItems(): PlanItem[] {
	return CORE_EXERCISES.map((exercise) => ({
		exerciseId: exercise.id,
		name: exercise.name,
		unit: 'reps' as const,
		target: DEFAULT_TARGET,
		secondsPerRep: exercise.secondsPerRep
	}));
}

export function defaultPlan(): PlanVersion {
	return { validFrom: WARMUP_START, items: defaultPlanItems() };
}

/** Plan, der an einem Tag gilt: die jüngste Version, die spätestens an diesem Tag beginnt. */
export function planFor(versions: readonly PlanVersion[], date: LocalDate): readonly PlanItem[] {
	let match: PlanVersion | undefined;
	for (const version of versions) {
		if (version.validFrom > date) continue;
		if (!match || version.validFrom > match.validFrom) match = version;
	}
	if (match) return match.items;
	const earliest = [...versions].sort((a, b) => a.validFrom.localeCompare(b.validFrom))[0];
	return earliest?.items ?? defaultPlanItems();
}

/** Prüft einen Plan und liefert eine deutsche Fehlermeldung oder null. */
export function planError(items: readonly Pick<PlanItem, 'exerciseId' | 'unit' | 'target'>[]): string | null {
	if (items.length === 0) return 'Ein Plan braucht mindestens eine Übung.';
	if (items.length > MAX_PLAN_ITEMS) return `Ein Plan hat höchstens ${MAX_PLAN_ITEMS} Übungen.`;
	const seen = new Set<string>();
	for (const item of items) {
		if (seen.has(item.exerciseId)) return 'Jede Übung darf nur einmal im Plan stehen.';
		seen.add(item.exerciseId);
		if (!(PLAN_UNITS as readonly string[]).includes(item.unit)) return 'Diese Einheit gibt es nicht.';
		if (!isValidTarget(item.unit, item.target)) {
			const limits = TARGET_LIMITS[item.unit];
			return `Das Ziel in ${UNIT_LABELS[item.unit].long} liegt zwischen ${String(limits.min).replace('.', ',')} und ${limits.max}.`;
		}
	}
	return null;
}

/** Einheiten, die zu einer Katalogübung passen. */
export function unitsFor(exercise: { kind: 'time' | 'reps'; tracksDistance: boolean }): PlanUnit[] {
	if (exercise.kind === 'reps') return ['reps'];
	return exercise.tracksDistance ? ['minutes', 'km'] : ['minutes'];
}
