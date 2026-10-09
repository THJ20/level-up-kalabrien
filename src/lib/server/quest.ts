import { and, asc, eq } from 'drizzle-orm';
import {
	EXERCISES,
	challengeDayNumber,
	isLocalDate,
	isValidSetReps,
	type Exercise,
	type LocalDate
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { questSets, sickNotes } from './db/schema';
import { forbidden, invalid, notFound } from './errors';
import { appendEvent, recordActivity } from './feed';
import { applyHunterChange } from './pipeline';

export interface QuestSetRow {
	id: string;
	hunterId: string;
	date: LocalDate;
	exercise: Exercise;
	reps: number;
	recordedAt: Date;
	clientId: string | null;
}

export interface SetInput {
	date: LocalDate;
	exercise: Exercise;
	reps: number;
	clientId?: string;
}

/** Erlaubt sind Challenge-Tage bis einschließlich heute. */
export function assertEntryDate(ctx: ServiceContext, date: LocalDate): void {
	if (!isLocalDate(date) || challengeDayNumber(date) === null || date > todayOf(ctx)) {
		throw invalid('Für diesen Tag kann nichts eingetragen werden.');
	}
}

function assertReps(reps: number): void {
	if (!isValidSetReps(reps)) throw invalid('Ein Satz hat 1 bis 500 Wiederholungen.');
}

function requireOwnSet(ctx: ServiceContext, hunterId: string, setId: string): QuestSetRow {
	const row = ctx.db.select().from(questSets).where(eq(questSets.id, setId)).get();
	if (!row) throw notFound('Diesen Satz gibt es nicht.');
	if (row.hunterId !== hunterId) throw forbidden('Du kannst nur deine eigenen Sätze ändern.');
	return row;
}

export function addSet(ctx: ServiceContext, hunterId: string, input: SetInput): QuestSetRow {
	if (!(EXERCISES as readonly string[]).includes(input.exercise)) throw invalid('Diese Übung gibt es nicht.');
	assertReps(input.reps);
	assertEntryDate(ctx, input.date);

	if (input.clientId) {
		const existing = ctx.db
			.select()
			.from(questSets)
			.where(and(eq(questSets.hunterId, hunterId), eq(questSets.clientId, input.clientId)))
			.get();
		if (existing) return existing;
	}

	return applyHunterChange(ctx, hunterId, () => {
		const row: QuestSetRow = {
			id: crypto.randomUUID(),
			hunterId,
			date: input.date,
			exercise: input.exercise,
			reps: input.reps,
			recordedAt: ctx.clock.now(),
			clientId: input.clientId ?? null
		};
		ctx.db.insert(questSets).values(row).run();
		recordActivity(ctx, hunterId, { date: input.date, reps: { [input.exercise]: input.reps } });
		return row;
	});
}

export function updateSet(
	ctx: ServiceContext,
	hunterId: string,
	setId: string,
	patch: { reps: number }
): QuestSetRow {
	const row = requireOwnSet(ctx, hunterId, setId);
	assertReps(patch.reps);
	return applyHunterChange(ctx, hunterId, () => {
		ctx.db.update(questSets).set({ reps: patch.reps }).where(eq(questSets.id, setId)).run();
		return { ...row, reps: patch.reps };
	});
}

export function deleteSet(ctx: ServiceContext, hunterId: string, setId: string): void {
	requireOwnSet(ctx, hunterId, setId);
	applyHunterChange(ctx, hunterId, () => {
		ctx.db.delete(questSets).where(eq(questSets.id, setId)).run();
	});
}

export function listSets(ctx: ServiceContext, hunterId: string, date: LocalDate): QuestSetRow[] {
	return ctx.db
		.select()
		.from(questSets)
		.where(and(eq(questSets.hunterId, hunterId), eq(questSets.date, date)))
		.orderBy(asc(questSets.recordedAt))
		.all();
}

export function reportSick(ctx: ServiceContext, hunterId: string, date: LocalDate): void {
	assertEntryDate(ctx, date);
	const existing = ctx.db
		.select({ id: sickNotes.id })
		.from(sickNotes)
		.where(and(eq(sickNotes.hunterId, hunterId), eq(sickNotes.date, date)))
		.get();
	if (existing) return;
	applyHunterChange(ctx, hunterId, () => {
		ctx.db
			.insert(sickNotes)
			.values({ id: crypto.randomUUID(), hunterId, date, recordedAt: ctx.clock.now() })
			.run();
		appendEvent(ctx, hunterId, 'sick', { date, backfilled: date < todayOf(ctx) });
	});
}

export function withdrawSick(ctx: ServiceContext, hunterId: string, date: LocalDate): void {
	const match = and(eq(sickNotes.hunterId, hunterId), eq(sickNotes.date, date));
	const existing = ctx.db.select({ id: sickNotes.id }).from(sickNotes).where(match).get();
	if (!existing) return;
	applyHunterChange(ctx, hunterId, () => {
		ctx.db.delete(sickNotes).where(match).run();
	});
}
