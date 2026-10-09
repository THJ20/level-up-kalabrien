import { eq } from 'drizzle-orm';
import { todayOf, type ServiceContext } from '../context';
import { hunters, invites } from '../db/schema';
import { ServiceError } from '../errors';
import {
	assertNameAvailable,
	toProfile,
	validateColor,
	validateHunterName,
	type HunterProfile,
	type HunterRole
} from '../hunters';
import { hashPassword, validatePassword } from './password';
import { createSession, type SessionToken } from './sessions';
import { generateToken, hashToken } from './tokens';

export const INVITE_DAYS = 7;
const DAY_MS = 86_400_000;

export interface RegistrationInput {
	name: string;
	password: string;
	color: string;
}

export function createInvite(
	ctx: ServiceContext,
	createdBy: string | null,
	role: HunterRole = 'hunter'
): SessionToken {
	const token = generateToken();
	const now = ctx.clock.now();
	const expiresAt = new Date(now.getTime() + INVITE_DAYS * DAY_MS);
	ctx.db
		.insert(invites)
		.values({
			id: crypto.randomUUID(),
			tokenHash: hashToken(token),
			role,
			createdBy,
			createdAt: now,
			expiresAt
		})
		.run();
	return { token, expiresAt };
}

/** Erzeugt eine Admin-Einladung, solange es noch keinen Hunter gibt. */
export function ensureAdminInvite(ctx: ServiceContext): string | null {
	const anyHunter = ctx.db.select({ id: hunters.id }).from(hunters).limit(1).get();
	if (anyHunter) return null;
	return createInvite(ctx, null, 'admin').token;
}

const invalidInvite = () =>
	new ServiceError('unauthorized', 'Der Einladungslink ist ungültig oder abgelaufen.');

function findUsableInvite(ctx: ServiceContext, token: string) {
	const invite = ctx.db.select().from(invites).where(eq(invites.tokenHash, hashToken(token))).get();
	if (!invite || invite.usedAt || invite.expiresAt.getTime() <= ctx.clock.now().getTime()) {
		throw invalidInvite();
	}
	return invite;
}

export async function redeemInvite(
	ctx: ServiceContext,
	token: string,
	input: RegistrationInput
): Promise<{ hunter: HunterProfile; session: SessionToken }> {
	findUsableInvite(ctx, token);
	const name = validateHunterName(input.name);
	const color = validateColor(input.color);
	validatePassword(input.password);
	assertNameAvailable(ctx, name);
	const passwordHash = await hashPassword(input.password);

	return ctx.db.transaction(() => {
		const invite = findUsableInvite(ctx, token);
		assertNameAvailable(ctx, name);
		const now = ctx.clock.now();
		const id = crypto.randomUUID();
		ctx.db
			.insert(hunters)
			.values({
				id,
				name,
				nameKey: name.toLowerCase(),
				color,
				passwordHash,
				role: invite.role,
				registeredOn: todayOf(ctx),
				createdAt: now
			})
			.run();
		ctx.db.update(invites).set({ usedAt: now, usedBy: id }).where(eq(invites.id, invite.id)).run();
		const row = ctx.db.select().from(hunters).where(eq(hunters.id, id)).get();
		return { hunter: toProfile(row!), session: createSession(ctx, id) };
	});
}
