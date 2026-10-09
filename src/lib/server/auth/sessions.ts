import { eq } from 'drizzle-orm';
import type { ServiceContext } from '../context';
import { hunters, sessions } from '../db/schema';
import { toProfile, type HunterProfile } from '../hunters';
import { generateToken, hashToken } from './tokens';

export const SESSION_DAYS = 180;
const RENEW_BELOW_DAYS = 150;
const DAY_MS = 86_400_000;

export interface SessionToken {
	token: string;
	expiresAt: Date;
}

export function createSession(ctx: ServiceContext, hunterId: string): SessionToken {
	const token = generateToken();
	const expiresAt = new Date(ctx.clock.now().getTime() + SESSION_DAYS * DAY_MS);
	ctx.db.insert(sessions).values({ id: hashToken(token), hunterId, expiresAt }).run();
	return { token, expiresAt };
}

/** Prüft ein Sitzungs-Token und verlängert die Sitzung, wenn weniger als 150 Tage übrig sind. */
export function validateSession(
	ctx: ServiceContext,
	token: string
): { hunter: HunterProfile; expiresAt: Date } | null {
	const id = hashToken(token);
	const row = ctx.db
		.select({ session: sessions, hunter: hunters })
		.from(sessions)
		.innerJoin(hunters, eq(sessions.hunterId, hunters.id))
		.where(eq(sessions.id, id))
		.get();
	if (!row) return null;

	const now = ctx.clock.now().getTime();
	if (row.session.expiresAt.getTime() <= now) {
		ctx.db.delete(sessions).where(eq(sessions.id, id)).run();
		return null;
	}
	if (!row.hunter.active) return null;

	let expiresAt = row.session.expiresAt;
	if (expiresAt.getTime() - now < RENEW_BELOW_DAYS * DAY_MS) {
		expiresAt = new Date(now + SESSION_DAYS * DAY_MS);
		ctx.db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id)).run();
	}
	return { hunter: toProfile(row.hunter), expiresAt };
}

export function invalidateSession(ctx: ServiceContext, token: string): void {
	ctx.db.delete(sessions).where(eq(sessions.id, hashToken(token))).run();
}

export function invalidateHunterSessions(ctx: ServiceContext, hunterId: string): void {
	ctx.db.delete(sessions).where(eq(sessions.hunterId, hunterId)).run();
}
