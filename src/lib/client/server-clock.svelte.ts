/** Abstand zwischen Server- und Geräteuhr, damit Countdowns auch bei simulierter Serverzeit stimmen. */
export const serverClock = $state({ offset: 0 });

export function serverNow(): number {
	return Date.now() + serverClock.offset;
}
