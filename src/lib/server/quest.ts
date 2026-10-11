import { and, asc, eq } from 'drizzle-orm';
import {
	SET_LIMITS,
	UNIT_LABELS,
	isTrackedDay,
	isValidSetValue,
	isWarmupDay,
	roundToUnit,
	type LocalDate,
	type PlanItem
} from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { exercises, questSets, sickNotes } from './db/schema';
import { forbidden, invalid, notFound } from './errors';
import { appendEvent } from './feed';
import { applyHunterChange } from './pipeline';
import { planOn } from './records';

export interface QuestSetRow {
	id: string;
	hunterId: string;
	date: LocalDate;
	exerciseId: string;
	value: number;
	recordedAt: Date;
	clientId: string | null;
}

export interface QuestSetView extends QuestSetRow {
	exerciseName: string;
}

export interface SetInput {
	date: LocalDate;
	exerciseId: string;
	value: number;
	clientId?: string;
}

/** Erlaubt sind Aufwärm- und Challenge-Tage bis einschließlich heute. */
export function assertEntryDate(ctx: ServiceContext, date: LocalDate): void {
	if (!isTrackedDay(date) || date > todayOf(ctx)) {
		throw invalid('Für diesen Tag kann nichts eingetragen werden.');
	}
}

function planItemFor(ctx: ServiceContext, hunterId: string, date: LocalDate, exerciseId: string): PlanItem {
	const item = planOn(ctx, hunterId, date).find((entry) => entry.exerciseId === exerciseId);
	if (!item) throw invalid('Diese Übung steht an diesem Tag nicht in deinem Trainingsplan.');
	return item;
}

function checkedValue(item: PlanItem, value: number): number {
	if (!isValidSetValue(item.unit, value)) {
		const limits = SET_LIMITS[item.unit];
		throw invalid(
			`Ein Satz ${item.name} hat ${String(limits.min).replace('.', ',')} bis ${limits.max} ${UNIT_LABELS[item.unit].long}.`
		);
	}
	return roundToUnit(item.unit, value);
}

function requireOwnSet(ctx: ServiceContext, hunterId: string, setId: string): QuestSetRow {
	const row = ctx.db.select().from(questSets).where(eq(questSets.id, setId)).get();
	if (!row) throw notFound('Diesen Satz gibt es nicht.');
	if (row.hunterId !== hunterId) throw forbidden('Du kannst nur deine eigenen Sätze ändern.');
	return row;
}

export function addSet(ctx: ServiceContext, hunterId: string, input: SetInput): QuestSetRow {
	assertEntryDate(ctx, input.date);
	const item = planItemFor(ctx, hunterId, input.date, input.exerciseId);
	const value = checkedValue(item, input.value);

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
			exerciseId: item.exerciseId,
			value,
			recordedAt: ctx.clock.now(),
			clientId: input.clientId ?? null
		};
		// Einzelne Sätze erscheinen nicht im Feed, nur das Ergebnis (Daily Quest erfüllt).
		ctx.db.insert(questSets).values(row).run();
		return row;
	});
}

export function updateSet(
	ctx: ServiceContext,
	hunterId: string,
	setId: string,
	patch: { value: number }
): QuestSetRow {
	const row = requireOwnSet(ctx, hunterId, setId);
	const item = planItemFor(ctx, hunterId, row.date, row.exerciseId);
	const value = checkedValue(item, patch.value);
	return applyHunterChange(ctx, hunterId, () => {
		ctx.db.update(questSets).set({ value }).where(eq(questSets.id, setId)).run();
		return { ...row, value };
	});
}

export function deleteSet(ctx: ServiceContext, hunterId: string, setId: string): void {
	requireOwnSet(ctx, hunterId, setId);
	applyHunterChange(ctx, hunterId, () => {
		ctx.db.delete(questSets).where(eq(questSets.id, setId)).run();
	});
}

export function listSets(ctx: ServiceContext, hunterId: string, date: LocalDate): QuestSetView[] {
	return ctx.db
		.select({ set: questSets, exerciseName: exercises.name })
		.from(questSets)
		.innerJoin(exercises, eq(questSets.exerciseId, exercises.id))
		.where(and(eq(questSets.hunterId, hunterId), eq(questSets.date, date)))
		.orderBy(asc(questSets.recordedAt))
		.all()
		.map(({ set, exerciseName }) => ({ ...set, exerciseName }));
}

export function reportSick(ctx: ServiceContext, hunterId: string, date: LocalDate): void {
	assertEntryDate(ctx, date);
	if (isWarmupDay(date)) throw invalid('Aufwärmtage zählen nicht, eine Krankmeldung ist dafür nicht nötig.');
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
