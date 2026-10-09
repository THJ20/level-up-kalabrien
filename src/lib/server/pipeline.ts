import { RANKS, fulfilledDays, levelProgress, type DaySummary } from '$lib/domain';
import type { ServiceContext } from './context';
import { syncBadges } from './badges';
import { appendEvent } from './feed';
import { hunterTimeline } from './records';
import { inTransaction } from './transaction';
import { syncMissedDays } from './votes';

function emitProgressEvents(
	ctx: ServiceContext,
	hunterId: string,
	before: readonly DaySummary[],
	after: readonly DaySummary[]
): void {
	const statusBefore = new Map(before.map((day) => [day.date, day.status]));
	for (const day of after) {
		if (day.status === 'fulfilled' && statusBefore.get(day.date) !== 'fulfilled') {
			appendEvent(ctx, hunterId, 'quest_complete', { date: day.date, backfilled: day.backfilled });
		}
	}

	const levelBefore = levelProgress(fulfilledDays(before));
	const levelAfter = levelProgress(fulfilledDays(after));
	if (levelAfter.level > levelBefore.level) {
		appendEvent(ctx, hunterId, 'level_up', { level: levelAfter.level });
	}
	if (RANKS.indexOf(levelAfter.rank) > RANKS.indexOf(levelBefore.rank)) {
		appendEvent(ctx, hunterId, 'rank_up', { rank: levelAfter.rank });
	}
}

/**
 * Führt eine Änderung an den Daten eines Hunters aus und zieht danach alles Abgeleitete nach:
 * Feed-Ereignisse für neu erfüllte Tage, Level- und Rangaufstiege, verpasste Tage, Abstimmungen und Badges.
 */
export function applyHunterChange<T>(ctx: ServiceContext, hunterId: string, mutate: () => T): T {
	const result = inTransaction(ctx, () => {
		const before = hunterTimeline(ctx, hunterId);
		const value = mutate();
		const after = hunterTimeline(ctx, hunterId);
		emitProgressEvents(ctx, hunterId, before, after);
		syncMissedDays(ctx, hunterId, after);
		syncBadges(ctx, hunterId, after);
		return value;
	});
	ctx.bus.publish(['board', 'feed', 'votes']);
	return result;
}
