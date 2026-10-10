import { and, asc, count, eq } from 'drizzle-orm';
import {
	BADGES,
	badgeProgress,
	earnedBadges,
	type BadgeContext,
	type BadgeGroup,
	type BadgeId,
	type BadgeProgress,
	type DaySummary
} from '#lib/domain/index.ts';
import type { ServiceContext } from './context';
import { ballots, hunterBadges, verdicts, votes } from './db/schema';
import { appendEvent } from './feed';
import { listActiveHunters, toRef, type HunterRef } from './hunters';
import { hunterTimeline, loadBonusEntries, planSaveCount } from './records';

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

function badgeContext(ctx: ServiceContext, hunterId: string, timeline?: readonly DaySummary[]): BadgeContext {
	return {
		timeline: timeline ?? hunterTimeline(ctx, hunterId),
		bonusEntries: loadBonusEntries(ctx, hunterId),
		activeVerdicts: activeVerdictCount(ctx, hunterId),
		ballotsInClosedVotes: closedBallotCount(ctx, hunterId),
		planSaves: planSaveCount(ctx, hunterId)
	};
}

/** Gleicht gespeicherte Badges mit den Bedingungen ab und liefert die neu erreichten. */
export function syncBadges(
	ctx: ServiceContext,
	hunterId: string,
	timeline?: readonly DaySummary[]
): BadgeId[] {
	const earned = earnedBadges(badgeContext(ctx, hunterId, timeline));
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

export interface BadgeInfo {
	id: BadgeId;
	name: string;
	group: BadgeGroup;
	description: string;
	icon: string;
	target: number;
	unit: string;
}

export interface BadgeOverview {
	badges: BadgeInfo[];
	hunters: { hunter: HunterRef; earned: { badgeId: BadgeId; earnedAt: Date }[] }[];
	/** Fortschritt des Betrachters je Badge. */
	progress: Record<BadgeId, BadgeProgress>;
}

/** Alles für die Erfolge-Seite: Katalog, Badges aller aktiven Hunter, eigener Fortschritt. */
export function badgeOverview(ctx: ServiceContext, viewerId: string): BadgeOverview {
	return {
		badges: BADGES.map(({ id, name, group, description, icon, target, unit }) => ({
			id,
			name,
			group,
			description,
			icon,
			target,
			unit
		})),
		hunters: listActiveHunters(ctx).map((hunter) => ({
			hunter: toRef(hunter),
			earned: listHunterBadges(ctx, hunter.id)
		})),
		progress: badgeProgress(badgeContext(ctx, viewerId))
	};
}
