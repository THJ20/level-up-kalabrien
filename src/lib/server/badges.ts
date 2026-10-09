import { and, asc, count, eq } from 'drizzle-orm';
import { earnedBadges, type BadgeId, type DaySummary } from '#lib/domain/index.ts';
import type { ServiceContext } from './context';
import { ballots, hunterBadges, verdicts, votes } from './db/schema';
import { appendEvent } from './feed';
import { hunterTimeline, loadBonusEntries } from './records';

function activeVerdictCount(ctx: ServiceContext, hunterId: string): number {
	const row = ctx.db
		.select({ value: count() })
		.from(verdicts)
		.where(and(eq(verdicts.hunterId, hunterId), eq(verdicts.status, 'imposed')))
		.get();
	return row?.value ?? 0;
}

function closedBallotCount(ctx: ServiceContext, hunterId: string): number {
	const row = ctx.db
		.select({ value: count() })
		.from(ballots)
		.innerJoin(votes, eq(ballots.voteId, votes.id))
		.where(and(eq(ballots.voterId, hunterId), eq(votes.status, 'closed')))
		.get();
	return row?.value ?? 0;
}

/** Gleicht gespeicherte Badges mit den Bedingungen ab und liefert die neu erreichten. */
export function syncBadges(
	ctx: ServiceContext,
	hunterId: string,
	timeline?: readonly DaySummary[]
): BadgeId[] {
	const earned = earnedBadges({
		timeline: timeline ?? hunterTimeline(ctx, hunterId),
		bonusEntries: loadBonusEntries(ctx, hunterId),
		activeVerdicts: activeVerdictCount(ctx, hunterId),
		ballotsInClosedVotes: closedBallotCount(ctx, hunterId)
	});
	const stored = new Set(
		ctx.db
			.select({ badgeId: hunterBadges.badgeId })
			.from(hunterBadges)
			.where(eq(hunterBadges.hunterId, hunterId))
			.all()
			.map((row) => row.badgeId)
	);
	const earnedSet = new Set(earned);
	const added = earned.filter((badgeId) => !stored.has(badgeId));

	for (const badgeId of added) {
		ctx.db.insert(hunterBadges).values({ hunterId, badgeId, earnedAt: ctx.clock.now() }).run();
		appendEvent(ctx, hunterId, 'badge', { badgeId });
	}
	for (const badgeId of stored) {
		if (earnedSet.has(badgeId)) continue;
		ctx.db
			.delete(hunterBadges)
			.where(and(eq(hunterBadges.hunterId, hunterId), eq(hunterBadges.badgeId, badgeId)))
			.run();
	}
	return added;
}

export function listHunterBadges(
	ctx: ServiceContext,
	hunterId: string
): { badgeId: BadgeId; earnedAt: Date }[] {
	return ctx.db
		.select({ badgeId: hunterBadges.badgeId, earnedAt: hunterBadges.earnedAt })
		.from(hunterBadges)
		.where(eq(hunterBadges.hunterId, hunterId))
		.orderBy(asc(hunterBadges.earnedAt))
		.all();
}
