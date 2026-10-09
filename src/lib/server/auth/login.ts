import type { ServiceContext } from '../context';
import { ServiceError } from '../errors';
import { findHunterByName, toProfile, type HunterProfile } from '../hunters';
import { verifyPassword } from './password';
import { createSession, type SessionToken } from './sessions';
import type { LoginThrottle } from './throttle';

export interface LoginInput {
	name: string;
	password: string;
	ip: string;
}

export async function login(
	ctx: ServiceContext,
	throttle: LoginThrottle,
	input: LoginInput
): Promise<{ hunter: HunterProfile; session: SessionToken }> {
	const key = `${input.name.trim().toLowerCase()}|${input.ip}`;
	if (throttle.isLocked(key)) {
		throw new ServiceError('locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
	}
	const row = findHunterByName(ctx, input.name);
	const valid = row !== undefined && row.active && (await verifyPassword(row.passwordHash, input.password));
	if (!valid) {
		throttle.recordFailure(key);
		throw new ServiceError('unauthorized', 'Name oder Passwort ist falsch.');
	}
	throttle.reset(key);
	return { hunter: toProfile(row), session: createSession(ctx, row.id) };
}
