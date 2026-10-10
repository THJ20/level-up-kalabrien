import { and, asc, eq, ne, or } from 'drizzle-orm';
import type { LocalDate } from '#lib/domain/index.ts';
import type { ServiceContext } from './context';
import { hunters } from './db/schema';
import { invalid, notFound, ServiceError } from './errors';
import { getGoLiveDate } from './settings';
import { AVATAR_COLORS, THEMES, avatarUrlOf, type Theme } from '../shared/constants';

export { AVATAR_COLORS };

export type HunterRole = 'admin' | 'hunter';

export interface HunterProfile {
	id: string;
	/** Name, den alle sehen: Spielername, sonst Login-Name. */
	name: string;
	/** Fester Name zum Anmelden. */
	loginName: string;
	/** Frei gewählter Spielername oder null. */
	displayName: string | null;
	color: string;
	avatarUrl: string | null;
	theme: Theme;
	role: HunterRole;
	active: boolean;
	registeredOn: LocalDate;
}

export interface HunterRef {
	id: string;
	name: string;
	color: string;
	avatarUrl: string | null;
}

export type HunterRow = typeof hunters.$inferSelect;

const NAME_PATTERN = /^[\p{L}\p{N} ._-]{2,20}$/u;

function normalizeName(name: string): string {
	return name.trim().replace(/\s+/g, ' ');
}

export function validateHunterName(name: string): string {
	const normalized = normalizeName(name);
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
		name: row.displayName ?? row.name,
		loginName: row.name,
		displayName: row.displayName,
		color: row.color,
		avatarUrl: avatarUrlOf(row.avatar),
		theme: row.theme,
		role: row.role,
		active: row.active,
		registeredOn: row.registeredOn
	};
}

export function toRef(profile: { id: string; name: string; color: string; avatarUrl: string | null }): HunterRef {
	return { id: profile.id, name: profile.name, color: profile.color, avatarUrl: profile.avatarUrl };
}

/** Kurzform eines Hunters direkt aus der Datenbankzeile. */
export function refOf(row: HunterRow): HunterRef {
	return toRef(toProfile(row));
}

export function findHunterRow(ctx: ServiceContext, id: string): HunterRow | undefined {
	return ctx.db.select().from(hunters).where(eq(hunters.id, id)).get();
}

export function findHunterByName(ctx: ServiceContext, name: string): HunterRow | undefined {
	return ctx.db
		.select()
		.from(hunters)
		.where(eq(hunters.nameKey, normalizeName(name).toLowerCase()))
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

export interface HunterSettings {
	pushEnabled: boolean;
	reminderEnabled: boolean;
	reminderTime: string;
	votePushEnabled: boolean;
	soundEnabled: boolean;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function requireHunterRow(ctx: ServiceContext, id: string): HunterRow {
	const row = findHunterRow(ctx, id);
	if (!row) throw notFound('Diesen Hunter gibt es nicht.');
	return row;
}

export function getSettings(ctx: ServiceContext, hunterId: string): HunterSettings {
	const row = requireHunterRow(ctx, hunterId);
	return {
		pushEnabled: row.pushEnabled,
		reminderEnabled: row.reminderEnabled,
		reminderTime: row.reminderTime,
		votePushEnabled: row.votePushEnabled,
		soundEnabled: row.soundEnabled
	};
}

export function updateSettings(
	ctx: ServiceContext,
	hunterId: string,
	patch: Partial<HunterSettings>
): HunterSettings {
	requireHunterRow(ctx, hunterId);
	if (patch.reminderTime !== undefined && !TIME_PATTERN.test(patch.reminderTime)) {
		throw invalid('Die Uhrzeit muss im Format HH:MM sein.');
	}
	const changes: Partial<HunterSettings> = {};
	for (const key of [
		'pushEnabled',
		'reminderEnabled',
		'reminderTime',
		'votePushEnabled',
		'soundEnabled'
	] as const) {
		if (patch[key] !== undefined) Object.assign(changes, { [key]: patch[key] });
	}
	if (Object.keys(changes).length > 0) {
		ctx.db.update(hunters).set(changes).where(eq(hunters.id, hunterId)).run();
	}
	return getSettings(ctx, hunterId);
}

export interface ProfilePatch {
	/** Neuer Spielername, `null` oder leer löscht ihn. */
	displayName?: string | null;
	color?: string;
	theme?: Theme;
}

export function updateProfile(ctx: ServiceContext, hunterId: string, patch: ProfilePatch): HunterProfile {
	requireHunterRow(ctx, hunterId);
	const changes: Partial<typeof hunters.$inferInsert> = {};
	if (patch.displayName !== undefined) {
		const raw = patch.displayName?.trim() ?? '';
		if (raw === '') {
			changes.displayName = null;
			changes.displayNameKey = null;
		} else {
			const name = validateHunterName(raw);
			assertNameAvailable(ctx, name, hunterId);
			changes.displayName = name;
			changes.displayNameKey = name.toLowerCase();
		}
	}
	if (patch.color !== undefined) changes.color = validateColor(patch.color);
	if (patch.theme !== undefined) {
		if (!(THEMES as readonly string[]).includes(patch.theme)) throw invalid('Dieses Farbschema gibt es nicht.');
		changes.theme = patch.theme;
	}
	if (Object.keys(changes).length > 0) {
		ctx.db.update(hunters).set(changes).where(eq(hunters.id, hunterId)).run();
		ctx.bus.publish(['hunters', 'board', 'feed']);
	}
	return getHunter(ctx, hunterId);
}

/** Speichert den Avatar-Wert (`preset:…`, `upload:…` oder null) und liefert den vorherigen. */
export function setAvatar(ctx: ServiceContext, hunterId: string, avatar: string | null): string | null {
	const previous = requireHunterRow(ctx, hunterId).avatar;
	ctx.db.update(hunters).set({ avatar }).where(eq(hunters.id, hunterId)).run();
	ctx.bus.publish(['hunters', 'board', 'feed']);
	return previous;
}

/** Erster gewerteter Tag eines Hunters: das spätere Datum aus Go-live und Registrierung. */
export function scoringStartOf(ctx: ServiceContext, hunter: { registeredOn: LocalDate }): LocalDate {
	const goLive = getGoLiveDate(ctx);
	return hunter.registeredOn > goLive ? hunter.registeredOn : goLive;
}

/** Login-Namen und Spielernamen müssen über alle Hunter hinweg eindeutig sein. */
export function assertNameAvailable(ctx: ServiceContext, name: string, exceptId?: string): void {
	const key = name.toLowerCase();
	const sameName = or(eq(hunters.nameKey, key), eq(hunters.displayNameKey, key));
	const clash = ctx.db
		.select({ id: hunters.id })
		.from(hunters)
		.where(exceptId ? and(sameName, ne(hunters.id, exceptId)) : sameName)
		.get();
	if (clash) throw new ServiceError('conflict', 'Diesen Namen gibt es schon.');
}
