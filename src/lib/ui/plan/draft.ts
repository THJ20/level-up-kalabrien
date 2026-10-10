import {
	TARGET_LIMITS,
	UNIT_LABELS,
	matchExercise,
	planError,
	roundToUnit,
	unitsFor,
	type ImportedItem,
	type PlanItem,
	type PlanUnit
} from '#lib/domain/index.ts';
import type { PlanItemPayload } from '#lib/client/actions.ts';

export interface CatalogExercise {
	id: string;
	name: string;
	kind: 'time' | 'reps';
	secondsPerRep: number | null;
	tracksDistance: boolean;
}

export interface NewExercise {
	name: string;
	kind: 'time' | 'reps';
	secondsPerRep: number | null;
	tracksDistance: boolean;
}

/** Ein Planpunkt im Editor, bevor er gespeichert ist. */
export interface DraftRow {
	key: string;
	exerciseId: string | null;
	newExercise: NewExercise | null;
	name: string;
	unit: PlanUnit;
	target: number;
}

let counter = 0;
const nextKey = () => `row-${++counter}`;

export function rowsFromPlan(items: readonly PlanItem[]): DraftRow[] {
	return items.map((item) => ({
		key: nextKey(),
		exerciseId: item.exerciseId,
		newExercise: null,
		name: item.name,
		unit: item.unit,
		target: item.target
	}));
}

export function rowFromExercise(exercise: CatalogExercise, unit: PlanUnit, target: number): DraftRow {
	return { key: nextKey(), exerciseId: exercise.id, newExercise: null, name: exercise.name, unit, target };
}

export function unitsOfRow(row: DraftRow, catalog: readonly CatalogExercise[]): PlanUnit[] {
	const shape = row.exerciseId ? catalog.find((exercise) => exercise.id === row.exerciseId) : row.newExercise;
	return shape ? unitsFor(shape) : [row.unit];
}

/** Startwert für das Ziel, wenn eine Übung neu in den Plan kommt. */
export function defaultTarget(unit: PlanUnit): number {
	return unit === 'reps' ? 50 : unit === 'minutes' ? 10 : 3;
}

/** Ordnet erkannte Zeilen dem Katalog zu. Unbekannte Übungen werden als neue vorgeschlagen. */
export function rowsFromImport(items: readonly ImportedItem[], catalog: readonly CatalogExercise[]): DraftRow[] {
	const rows: DraftRow[] = [];
	for (const item of items) {
		const id = matchExercise(item.name, catalog);
		const exercise = id ? catalog.find((entry) => entry.id === id) : undefined;
		if (exercise && rows.some((row) => row.exerciseId === exercise.id)) continue;
		if (exercise) {
			const units = unitsFor(exercise);
			const unit = units.includes(item.unit) ? item.unit : units[0];
			rows.push(rowFromExercise(exercise, unit, unit === item.unit ? item.target : defaultTarget(unit)));
		} else {
			rows.push({
				key: nextKey(),
				exerciseId: null,
				newExercise: {
					name: item.name.slice(0, 40),
					kind: item.unit === 'reps' ? 'reps' : 'time',
					secondsPerRep: item.unit === 'reps' ? 3 : null,
					tracksDistance: item.unit === 'km'
				},
				name: item.name.slice(0, 40),
				unit: item.unit,
				target: item.target
			});
		}
	}
	return rows;
}

/** Fehlermeldung für den Entwurf oder null, wenn er gespeichert werden kann. */
export function draftError(rows: readonly DraftRow[]): string | null {
	for (const row of rows) {
		if (row.newExercise && (row.newExercise.name.trim().length < 2 || row.newExercise.name.trim().length > 40)) {
			return 'Neue Übungen brauchen einen Namen mit 2 bis 40 Zeichen.';
		}
	}
	return planError(
		rows.map((row) => ({ exerciseId: row.exerciseId ?? `neu:${row.newExercise?.name.toLowerCase()}`, unit: row.unit, target: row.target }))
	);
}

export function toPayload(rows: readonly DraftRow[]): PlanItemPayload[] {
	return rows.map((row) => ({
		...(row.exerciseId ? { exerciseId: row.exerciseId } : { newExercise: { ...(row.newExercise as NewExercise) } }),
		unit: row.unit,
		target: roundToUnit(row.unit, row.target)
	}));
}

export function targetHint(unit: PlanUnit): string {
	const limits = TARGET_LIMITS[unit];
	return `${String(limits.min).replace('.', ',')} bis ${limits.max} ${UNIT_LABELS[unit].long}`;
}
