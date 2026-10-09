import { and, asc, eq, ne } from 'drizzle-orm';
import type { LocalDate } from '$lib/domain';
import type { ServiceContext } from './context';
import { hunters } from './db/schema';
import { invalid, notFound, ServiceError } from './errors';

export const AVATAR_COLORS = [
	'#a47cff',
	'#7ef0d0',
	'#ff7a45',
	'#4cc9ff',
	'#ff4f7b',
	'#f5c542',
	'#62f0a6',
	'#c9b2ff'
] as const;

export type HunterRole = 'admin' | 'hunter';

export interface HunterProfile {
	id: string;
	name: string;
	color: string;
	role: HunterRole;
	active: boolean;
	registeredOn: LocalDate;
}

export interface HunterRef {
	id: string;
	name: string;
	color: string;
}

type HunterRow = typeof hunters.$inferSelect;

const NAME_PATTERN = /^[\p{L}\p{N} ._-]{2,20}$/u;

export function validateHunterName(name: string): string {
	const normalized = name.trim().replace(/\s+/g, ' ');
	if (!NAME_PATTERN.test(normalized)) {
		throw invalid('Der Name muss 2 bis 20 Zeichen haben (Buchstaben, Ziffern, Leerzeichen, Punkt, Unterstrich, Bindestrich).');
	}
	return normalized;
}

export function validateColor(color: string): string {
	if (!(AVATAR_COLORS as readonly string[]).includes(color)) throw invalid('Diese Farbe steht nicht zur Auswahl.');
	return color;
}

export function toProfile(row: HunterRow): HunterProfile {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		role: row.role,
		active: row.active,
		registeredOn: row.registeredOn
	};
}

export function toRef(profile: { id: string; name: string; color: string }): HunterRef {
	return { id: profile.id, name: profile.name, color: profile.color };
}

export function findHunterRow(ctx: ServiceContext, id: string): HunterRow | undefined {
	return ctx.db.select().from(hunters).where(eq(hunters.id, id)).get();
}

export function findHunterByName(ctx: ServiceContext, name: string): HunterRow | undefined {
	return ctx.db
		.select()
		.from(hunters)
		.where(eq(hunters.nameKey, name.trim().replace(/\s+/g, ' ').toLowerCase()))
		.get();
}

export function getHunter(ctx: ServiceContext, id: string): HunterProfile {
	const row = findHunterRow(ctx, id);
	if (!row) throw notFound('Diesen Hunter gibt es nicht.');
	return toProfile(row);
}

export function listActiveHunters(ctx: ServiceContext): HunterProfile[] {
	return ctx.db
		.select()
		.from(hunters)
		.where(eq(hunters.active, true))
		.orderBy(asc(hunters.nameKey))
		.all()
		.map(toProfile);
}

export function assertNameAvailable(ctx: ServiceContext, name: string, exceptId?: string): void {
	const key = name.toLowerCase();
	const clash = ctx.db
		.select({ id: hunters.id })
		.from(hunters)
		.where(exceptId ? and(eq(hunters.nameKey, key), ne(hunters.id, exceptId)) : eq(hunters.nameKey, key))
		.get();
	if (clash) throw new ServiceError('conflict', 'Diesen Namen gibt es schon.');
}
