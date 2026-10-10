import { and, asc, eq, ne } from 'drizzle-orm';
import {
	CORE_EXERCISES,
	EFFORTS,
	isValidBonusReps,
	isValidMinutes,
	isValidSecondsPerRep,
	repsBonusPoints,
	timeBonusPoints,
	type Effort,
	type LocalDate
} from '#lib/domain/index.ts';
import type { ServiceContext } from './context';
import { bonusEntries, exercises, hunters } from './db/schema';
import { forbidden, invalid, notFound, ServiceError } from './errors';
import { recordActivity } from './feed';
import { applyHunterChange } from './pipeline';
import { assertEntryDate } from './quest';

export type ExerciseKind = 'time' | 'reps';

export interface CatalogExercise {
	id: string;
	name: string;
	kind: ExerciseKind;
	secondsPerRep: number | null;
	tracksDistance: boolean;
	isRunning: boolean;
	createdBy: string | null;
	archived: boolean;
}

export interface ExerciseInput {
	name: string;
	kind: ExerciseKind;
	secondsPerRep?: number | null;
	tracksDistance?: boolean;
	isRunning?: boolean;
}

export interface BonusInput {
	exerciseId: string;
	date: LocalDate;
	minutes?: number | null;
	reps?: number | null;
	effort: Effort;
	distanceKm?: number | null;
	clientId?: string;
}

export interface BonusEntryView {
	id: string;
	hunterId: string;
	date: LocalDate;
	exercise: { id: string; name: string; kind: ExerciseKind };
	minutes: number | null;
	reps: number | null;
	effort: Effort;
	distanceKm: number | null;
	bonusPoints: number;
	recordedAt: Date;
}

const MAX_DISTANCE_KM = 500;

// ---------- Katalog ----------

function toCatalogExercise(row: typeof exercises.$inferSelect): CatalogExercise {
	return {
		id: row.id,
		name: row.name,
		kind: row.kind,
		secondsPerRep: row.secondsPerRep,
		tracksDistance: row.tracksDistance,
		isRunning: row.isRunning,
		createdBy: row.createdBy,
		archived: row.archived
	};
}

export function getExercise(ctx: ServiceContext, id: string): CatalogExercise {
	const row = ctx.db.select().from(exercises).where(eq(exercises.id, id)).get();
	if (!row) throw notFound('Diese Übung gibt es nicht.');
	return toCatalogExercise(row);
}

function cleanExerciseName(ctx: ServiceContext, name: string, exceptId?: string): string {
	const trimmed = name.trim().replace(/\s+/g, ' ');
	if (trimmed.length < 2 || trimmed.length > 40) throw invalid('Der Name einer Übung hat 2 bis 40 Zeichen.');
	const others = ctx.db
		.select({ id: exercises.id, name: exercises.name })
		.from(exercises)
		.where(exceptId ? ne(exercises.id, exceptId) : undefined)
		.all();
	if (others.some((other) => other.name.toLowerCase() === trimmed.toLowerCase())) {
		throw new ServiceError('conflict', 'Diese Übung gibt es schon.');
	}
	return trimmed;
}

function validateShape(kind: ExerciseKind, secondsPerRep: number | null, tracksDistance: boolean, isRunning: boolean) {
	if (kind === 'reps' && (secondsPerRep === null || !isValidSecondsPerRep(secondsPerRep))) {
		throw invalid('Wiederholungs-Übungen brauchen 2 bis 10 Sekunden pro Wiederholung.');
	}
	if (kind === 'time' && secondsPerRep !== null) throw invalid('Zeit-Übungen haben keine Sekunden pro Wiederholung.');
	if (kind === 'reps' && tracksDistance) throw invalid('Nur Zeit-Übungen können eine Strecke haben.');
	if (isRunning && !tracksDistance) throw invalid('Laufen braucht eine Strecke.');
}

function requireEditableExercise(ctx: ServiceContext, hunterId: string, id: string): CatalogExercise {
	const exercise = getExercise(ctx, id);
	const isAdmin =
		ctx.db.select({ role: hunters.role }).from(hunters).where(eq(hunters.id, hunterId)).get()?.role === 'admin';
	const allowed = exercise.createdBy === null ? isAdmin : exercise.createdBy === hunterId;
	if (!allowed) throw forbidden('Nur wer die Übung angelegt hat, kann sie ändern.');
	return exercise;
}

export function listExercises(
	ctx: ServiceContext,
	options: { includeArchived?: boolean } = {}
): CatalogExercise[] {
	return ctx.db
		.select()
		.from(exercises)
		.where(options.includeArchived ? undefined : eq(exercises.archived, false))
		.orderBy(asc(exercises.name))
		.all()
		.map(toCatalogExercise);
}

export function createExercise(ctx: ServiceContext, hunterId: string, input: ExerciseInput): CatalogExercise {
	const name = cleanExerciseName(ctx, input.name);
	const secondsPerRep = input.secondsPerRep ?? null;
	const tracksDistance = input.tracksDistance ?? false;
	const isRunning = input.isRunning ?? false;
	validateShape(input.kind, secondsPerRep, tracksDistance, isRunning);
	const id = crypto.randomUUID();
	ctx.db
		.insert(exercises)
		.values({
			id,
			name,
			kind: input.kind,
			secondsPerRep,
			tracksDistance,
			isRunning,
			createdBy: hunterId,
			createdAt: ctx.clock.now()
		})
		.run();
	ctx.bus.publish(['catalog']);
	return getExercise(ctx, id);
}

export function updateExercise(
	ctx: ServiceContext,
	hunterId: string,
	id: string,
	patch: Partial<Omit<ExerciseInput, 'kind'>>
): CatalogExercise {
	const current = requireEditableExercise(ctx, hunterId, id);
	const name = patch.name !== undefined ? cleanExerciseName(ctx, patch.name, id) : current.name;
	const secondsPerRep = patch.secondsPerRep !== undefined ? patch.secondsPerRep : current.secondsPerRep;
	const tracksDistance = patch.tracksDistance ?? current.tracksDistance;
	const isRunning = patch.isRunning ?? current.isRunning;
	validateShape(current.kind, secondsPerRep, tracksDistance, isRunning);
	ctx.db
		.update(exercises)
		.set({ name, secondsPerRep, tracksDistance, isRunning })
		.where(eq(exercises.id, id))
		.run();
	ctx.bus.publish(['catalog']);
	return getExercise(ctx, id);
}

export function archiveExercise(ctx: ServiceContext, hunterId: string, id: string): CatalogExercise {
	requireEditableExercise(ctx, hunterId, id);
	if (CORE_EXERCISES.some((core) => core.id === id)) throw forbidden('Die Kernübungen bleiben im Katalog.');
	ctx.db.update(exercises).set({ archived: true }).where(eq(exercises.id, id)).run();
	ctx.bus.publish(['catalog']);
	return getExercise(ctx, id);
}

// ---------- Einträge ----------

interface EntryValues {
	minutes: number | null;
	reps: number | null;
	effort: Effort;
	distanceKm: number | null;
}

function validateEntry(exercise: CatalogExercise, values: EntryValues): number {
	if (!(EFFORTS as readonly string[]).includes(values.effort)) throw invalid('Diese Stufe gibt es nicht.');
	if (exercise.kind === 'time') {
		if (values.minutes === null || !isValidMinutes(values.minutes)) {
			throw invalid('Gib die Dauer in ganzen Minuten an (1 bis 600).');
		}
		if (values.reps !== null) throw invalid('Bei dieser Übung zählen Minuten, keine Wiederholungen.');
	} else {
		if (values.reps === null || !isValidBonusReps(values.reps)) {
			throw invalid('Gib 1 bis 1000 Wiederholungen an.');
		}
		if (values.minutes !== null) throw invalid('Bei dieser Übung zählen Wiederholungen, keine Minuten.');
	}
	if (values.distanceKm !== null) {
		if (!exercise.tracksDistance) throw invalid('Bei dieser Übung gibt es keine Strecke.');
		if (!(values.distanceKm > 0 && values.distanceKm <= MAX_DISTANCE_KM)) {
			throw invalid('Die Strecke liegt zwischen 0 und 500 km.');
		}
	}
	return exercise.kind === 'time'
		? timeBonusPoints(values.minutes as number, values.effort)
		: repsBonusPoints(values.reps as number, exercise.secondsPerRep as number, values.effort);
}

function toEntryView(row: typeof bonusEntries.$inferSelect, exercise: CatalogExercise): BonusEntryView {
	return {
		id: row.id,
		hunterId: row.hunterId,
		date: row.date,
		exercise: { id: exercise.id, name: exercise.name, kind: exercise.kind },
		minutes: row.minutes,
		reps: row.reps,
		effort: row.effort,
		distanceKm: row.distanceKm,
		bonusPoints: row.bonusPoints,
		recordedAt: row.recordedAt
	};
}

function requireOwnEntry(ctx: ServiceContext, hunterId: string, id: string) {
	const row = ctx.db.select().from(bonusEntries).where(eq(bonusEntries.id, id)).get();
	if (!row) throw notFound('Diesen Bonus-Eintrag gibt es nicht.');
	if (row.hunterId !== hunterId) throw forbidden('Du kannst nur deine eigenen Einträge ändern.');
	return row;
}

export function addBonusEntry(ctx: ServiceContext, hunterId: string, input: BonusInput): BonusEntryView {
	const exercise = getExercise(ctx, input.exerciseId);
	if (exercise.archived) throw invalid('Diese Übung ist archiviert.');
	assertEntryDate(ctx, input.date);
	const values: EntryValues = {
		minutes: input.minutes ?? null,
		reps: input.reps ?? null,
		effort: input.effort,
		distanceKm: input.distanceKm ?? null
	};
	const bonusPoints = validateEntry(exercise, values);

	if (input.clientId) {
		const existing = ctx.db
			.select()
			.from(bonusEntries)
			.where(and(eq(bonusEntries.hunterId, hunterId), eq(bonusEntries.clientId, input.clientId)))
			.get();
		if (existing) return toEntryView(existing, getExercise(ctx, existing.exerciseId));
	}

	return applyHunterChange(ctx, hunterId, () => {
		const row = {
			id: crypto.randomUUID(),
			hunterId,
			exerciseId: exercise.id,
			date: input.date,
			...values,
			bonusPoints,
			recordedAt: ctx.clock.now(),
			clientId: input.clientId ?? null
		};
		ctx.db.insert(bonusEntries).values(row).run();
		recordActivity(ctx, hunterId, {
			date: input.date,
			bonus: { exercise: exercise.name, ...values, points: bonusPoints }
		});
		return toEntryView(row, exercise);
	});
}

export function updateBonusEntry(
	ctx: ServiceContext,
	hunterId: string,
	id: string,
	patch: Partial<EntryValues>
): BonusEntryView {
	const row = requireOwnEntry(ctx, hunterId, id);
	const exercise = getExercise(ctx, row.exerciseId);
	const values: EntryValues = {
		minutes: patch.minutes !== undefined ? patch.minutes : row.minutes,
		reps: patch.reps !== undefined ? patch.reps : row.reps,
		effort: patch.effort ?? row.effort,
		distanceKm: patch.distanceKm !== undefined ? patch.distanceKm : row.distanceKm
	};
	const bonusPoints = validateEntry(exercise, values);
	return applyHunterChange(ctx, hunterId, () => {
		ctx.db
			.update(bonusEntries)
			.set({ ...values, bonusPoints })
			.where(eq(bonusEntries.id, id))
			.run();
		return toEntryView({ ...row, ...values, bonusPoints }, exercise);
	});
}

export function deleteBonusEntry(ctx: ServiceContext, hunterId: string, id: string): void {
	requireOwnEntry(ctx, hunterId, id);
	applyHunterChange(ctx, hunterId, () => {
		ctx.db.delete(bonusEntries).where(eq(bonusEntries.id, id)).run();
	});
}

export function listBonusEntries(ctx: ServiceContext, hunterId: string, date: LocalDate): BonusEntryView[] {
	return ctx.db
		.select({ entry: bonusEntries, exercise: exercises })
		.from(bonusEntries)
		.innerJoin(exercises, eq(bonusEntries.exerciseId, exercises.id))
		.where(and(eq(bonusEntries.hunterId, hunterId), eq(bonusEntries.date, date)))
		.orderBy(asc(bonusEntries.recordedAt))
		.all()
		.map(({ entry, exercise }) => toEntryView(entry, toCatalogExercise(exercise)));
}
