import type { LocalDate } from './challenge';
import type { PlanItem } from './plan';

/** Ein Satz der Daily Quest: Wert in der Einheit des Planpunkts dieser Übung. */
export interface QuestSet {
	id: string;
	date: LocalDate;
	exerciseId: string;
	value: number;
	recordedAt: Date;
}

/** Summen eines Tages je Übungs-ID. */
export type Totals = Record<string, number>;

const EPSILON = 1e-9;

export function totalsOf(sets: readonly Pick<QuestSet, 'exerciseId' | 'value'>[]): Totals {
	const totals: Totals = {};
	for (const entry of sets) totals[entry.exerciseId] = (totals[entry.exerciseId] ?? 0) + entry.value;
	for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * 1000) / 1000;
	return totals;
}

export function itemDone(item: Pick<PlanItem, 'exerciseId' | 'target'>, totals: Totals): boolean {
	return (totals[item.exerciseId] ?? 0) + EPSILON >= item.target;
}

/** Erfüllt, wenn jeder Planpunkt sein Ziel erreicht. */
export function isQuestComplete(plan: readonly PlanItem[], totals: Totals): boolean {
	return plan.length > 0 && plan.every((item) => itemDone(item, totals));
}

/** Fortschritt 0 bis 1: Mittel der auf das Ziel gekappten Anteile aller Planpunkte. */
export function questProgress(plan: readonly PlanItem[], totals: Totals): number {
	if (plan.length === 0) return 0;
	const sum = plan.reduce((total, item) => total + Math.min(1, (totals[item.exerciseId] ?? 0) / item.target), 0);
	return sum / plan.length;
}

/** Erfassungszeitpunkt des Satzes, mit dem die Daily Quest eines Tages erfüllt wurde. */
export function completionTime(plan: readonly PlanItem[], setsOfDay: readonly QuestSet[]): Date | null {
	const ordered = [...setsOfDay].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
	const totals: Totals = {};
	for (const entry of ordered) {
		totals[entry.exerciseId] = (totals[entry.exerciseId] ?? 0) + entry.value;
		if (isQuestComplete(plan, totals)) return entry.recordedAt;
	}
	return null;
}
