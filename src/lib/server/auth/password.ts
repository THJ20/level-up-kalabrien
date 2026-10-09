import { hash, verify } from '@node-rs/argon2';
import { invalid } from '../errors';

export const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 200;

export function validatePassword(password: string): void {
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw invalid(`Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
	}
	if (password.length > MAX_PASSWORD_LENGTH) throw invalid('Das Passwort ist zu lang.');
}

/** Argon2id mit den Standardparametern von @node-rs/argon2. */
export function hashPassword(password: string): Promise<string> {
	return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
	try {
		return await verify(passwordHash, password);
	} catch {
		return false;
	}
}
