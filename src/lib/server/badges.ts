import type { BadgeId, DaySummary } from '$lib/domain';
import type { ServiceContext } from './context';

/** Gleicht die Badges eines Hunters ab (Ausbau in Task 6). */
export function syncBadges(
	_ctx: ServiceContext,
	_hunterId: string,
	_timeline?: readonly DaySummary[]
): BadgeId[] {
	return [];
}
