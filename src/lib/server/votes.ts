import type { DaySummary } from '$lib/domain';
import type { ServiceContext } from './context';

/** Gleicht verpasste Tage eines Hunters ab (Ausbau in Task 5). */
export function syncMissedDays(
	_ctx: ServiceContext,
	_hunterId: string,
	_timeline: readonly DaySummary[]
): void {}
