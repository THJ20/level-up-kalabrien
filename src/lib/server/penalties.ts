import { asc, eq } from 'drizzle-orm';
import type { ServiceContext } from './context';
import { penalties } from './db/schema';
import { forbidden, invalid, notFound } from './errors';

export interface Penalty {
	id: string;
	title: string;
	description: string;
	createdBy: string;
	archived: boolean;
	createdAt: Date;
}

export interface PenaltyInput {
	title: string;
	description?: string;
}

const MAX_TITLE = 80;
const MAX_DESCRIPTION = 500;

function cleanTitle(title: string): string {
	const trimmed = title.trim();
	if (trimmed.length < 1 || trimmed.length > MAX_TITLE) {
		throw invalid(`Der Titel einer Strafe hat 1 bis ${MAX_TITLE} Zeichen.`);
	}
	return trimmed;
}

function cleanDescription(description: string | undefined): string {
	const trimmed = (description ?? '').trim();
	if (trimmed.length > MAX_DESCRIPTION) {
		throw invalid(`Die Beschreibung hat höchstens ${MAX_DESCRIPTION} Zeichen.`);
	}
	return trimmed;
}

export function getPenalty(ctx: ServiceContext, id: string): Penalty {
	const row = ctx.db.select().from(penalties).where(eq(penalties.id, id)).get();
	if (!row) throw notFound('Diese Strafe gibt es nicht.');
	return row;
}

function requireOwnPenalty(ctx: ServiceContext, hunterId: string, id: string): Penalty {
	const penalty = getPenalty(ctx, id);
	if (penalty.createdBy !== hunterId) throw forbidden('Nur wer die Strafe angelegt hat, kann sie ändern.');
	return penalty;
}

export function createPenalty(ctx: ServiceContext, hunterId: string, input: PenaltyInput): Penalty {
	const penalty: Penalty = {
		id: crypto.randomUUID(),
		title: cleanTitle(input.title),
		description: cleanDescription(input.description),
		createdBy: hunterId,
		archived: false,
		createdAt: ctx.clock.now()
	};
	ctx.db.insert(penalties).values(penalty).run();
	ctx.bus.publish(['votes']);
	return penalty;
}

export function updatePenalty(
	ctx: ServiceContext,
	hunterId: string,
	id: string,
	patch: Partial<PenaltyInput>
): Penalty {
	requireOwnPenalty(ctx, hunterId, id);
	const changes: Partial<Penalty> = {};
	if (patch.title !== undefined) changes.title = cleanTitle(patch.title);
	if (patch.description !== undefined) changes.description = cleanDescription(patch.description);
	if (Object.keys(changes).length > 0) {
		ctx.db.update(penalties).set(changes).where(eq(penalties.id, id)).run();
		ctx.bus.publish(['votes']);
	}
	return getPenalty(ctx, id);
}

export function archivePenalty(ctx: ServiceContext, hunterId: string, id: string): Penalty {
	requireOwnPenalty(ctx, hunterId, id);
	ctx.db.update(penalties).set({ archived: true }).where(eq(penalties.id, id)).run();
	ctx.bus.publish(['votes']);
	return getPenalty(ctx, id);
}

export function listPenalties(
	ctx: ServiceContext,
	options: { includeArchived?: boolean } = {}
): Penalty[] {
	return ctx.db
		.select()
		.from(penalties)
		.where(options.includeArchived ? undefined : eq(penalties.archived, false))
		.orderBy(asc(penalties.createdAt), asc(penalties.title))
		.all();
}
