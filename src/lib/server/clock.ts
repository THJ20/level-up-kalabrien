export interface Clock {
	now(): Date;
}

export const systemClock: Clock = {
	now: () => new Date()
};

/** Uhr, die ab dem Start bei `start` beginnt und normal weiterläuft. Nur zum Ausprobieren. */
export function simulatedClock(start: Date, real: Clock = systemClock): Clock {
	const offset = start.getTime() - real.now().getTime();
	return { now: () => new Date(real.now().getTime() + offset) };
}
