import type { Clock } from '../clock';

interface FailureState {
	count: number;
	lockedUntil: number | null;
}

/** Login-Bremse im Speicher: nach `maxFailures` Fehlversuchen ist der Schlüssel `lockMs` lang gesperrt. */
export class LoginThrottle {
	private readonly failures = new Map<string, FailureState>();

	constructor(
		private readonly clock: Clock,
		private readonly maxFailures = 5,
		private readonly lockMs = 15 * 60_000
	) {}

	isLocked(key: string): boolean {
		const state = this.failures.get(key);
		if (!state?.lockedUntil) return false;
		if (this.clock.now().getTime() >= state.lockedUntil) {
			this.failures.delete(key);
			return false;
		}
		return true;
	}

	recordFailure(key: string): void {
		const state = this.failures.get(key) ?? { count: 0, lockedUntil: null };
		state.count += 1;
		if (state.count >= this.maxFailures) state.lockedUntil = this.clock.now().getTime() + this.lockMs;
		this.failures.set(key, state);
	}

	reset(key: string): void {
		this.failures.delete(key);
	}
}
