import { and, desc, eq, gte, inArray, ne } from 'drizzle-orm';
import {
	eligibleVoters,
	reconcileMissedDays,
	tallyVote,
	type DaySummary,
	type LiftReason,
	type LocalDate
} from '#lib/domain/index.ts';
import type { ServiceContext } from './context';
import { ballots, hunters, missedDays, penalties, verdicts, voteVoters, votes } from './db/schema';
import { forbidden, invalid, ServiceError } from './errors';
import { appendEvent } from './feed';
import { shortDate } from './format';
import { getHunter, listActiveHunters, toRef, type HunterRef } from './hunters';
import { createPenalty, getPenalty, listPenalties, type Penalty, type PenaltyInput } from './penalties';
import { hunterTimeline } from './records';
import { syncBadges } from './badges';
import { inTransaction } from './transaction';

type VoteRow = typeof votes.$inferSelect;
type MissedDayRow = typeof missedDays.$inferSelect;

export interface VoteView {
	id: string;
	status: VoteRow['status'];
	date: LocalDate;
	offender: HunterRef;
	voters: { hunter: HunterRef; hasVoted: boolean }[];
	myBallot: string | null;
	options: Penalty[];
	/** Stimmen je Strafe, erst nach dem Ende sichtbar. */
	counts: Record<string, number> | null;
	winner: Penalty | null;
	decidedByLot: boolean;
	createdAt: Date;
	closedAt: Date | null;
}

export interface VerdictView {
	id: string;
	hunter: HunterRef;
	date: LocalDate;
	penalty: Penalty;
	decidedAt: Date;
	decidedByLot: boolean;
	status: 'imposed' | 'lifted';
	liftReason: LiftReason | null;
}

// ---------- Verpasste Tage ----------

function createMissedDay(ctx: ServiceContext, hunterId: string, date: LocalDate): void {
	const now = ctx.clock.now();
	const missedDayId = crypto.randomUUID();
	ctx.db
		.insert(missedDays)
		.values({ id: missedDayId, hunterId, date, status: 'active', createdAt: now })
		.run();

	const voters = eligibleVoters(
		listActiveHunters(ctx).map((hunter) => hunter.id),
		hunterId
	);
	let voteId: string | null = null;
	if (voters.length > 0) {
		voteId = crypto.randomUUID();
		ctx.db
			.insert(votes)
			.values({ id: voteId, missedDayId, offenderId: hunterId, date, status: 'open', createdAt: now })
			.run();
		ctx.db
			.insert(voteVoters)
			.values(voters.map((voter) => ({ voteId: voteId as string, hunterId: voter })))
			.run();
		notifyVoteStarted(ctx, voteId, hunterId, date, voters);
	}
	appendEvent(ctx, hunterId, 'missed', { date, voteId });
}

function notifyVoteStarted(
	ctx: ServiceContext,
	voteId: string,
	offenderId: string,
	date: LocalDate,
	voters: string[]
): void {
	const recipients = ctx.db
		.select({ id: hunters.id })
		.from(hunters)
		.where(and(inArray(hunters.id, voters), eq(hunters.votePushEnabled, true)))
		.all()
		.map((row) => row.id);
	if (recipients.length === 0) return;
	const offender = getHunter(ctx, offenderId);
	ctx.notifier.notify(
		recipients,
		{
			title: 'Abstimmung gestartet',
			body: `${offender.name} hat die Daily Quest am ${shortDate(date)} verpasst. Stimm über die Strafe ab.`,
			url: '/strafen',
			tag: `vote-${voteId}`
		},
		'vote'
	);
}

function liftMissedDay(ctx: ServiceContext, row: MissedDayRow, reason: LiftReason): void {
	const now = ctx.clock.now();
	ctx.db
		.update(missedDays)
		.set({ status: 'lifted', liftReason: reason, liftedAt: now })
		.where(eq(missedDays.id, row.id))
		.run();

	let verdictLifted = false;
	const vote = ctx.db.select().from(votes).where(eq(votes.missedDayId, row.id)).get();
	if (vote?.status === 'open') {
		ctx.db.update(votes).set({ status: 'cancelled', closedAt: now }).where(eq(votes.id, vote.id)).run();
	} else if (vote?.status === 'closed') {
		const verdict = ctx.db.select().from(verdicts).where(eq(verdicts.voteId, vote.id)).get();
		if (verdict?.status === 'imposed') {
			ctx.db
				.update(verdicts)
				.set({ status: 'lifted', liftReason: reason, liftedAt: now })
				.where(eq(verdicts.id, verdict.id))
				.run();
			verdictLifted = true;
		}
	}
	appendEvent(ctx, row.hunterId, 'missed_lifted', { date: row.date, reason, verdictLifted });
}

/** Legt neue verpasste Tage samt Abstimmung an und hebt nachgetragene oder krank gemeldete auf. */
export function syncMissedDays(
	ctx: ServiceContext,
	hunterId: string,
	timeline: readonly DaySummary[]
): void {
	const active = ctx.db
		.select()
		.from(missedDays)
		.where(and(eq(missedDays.hunterId, hunterId), eq(missedDays.status, 'active')))
		.all();
	const changes = reconcileMissedDays(timeline, new Set(active.map((row) => row.date)));
	for (const date of changes.create) createMissedDay(ctx, hunterId, date);
	for (const { date, reason } of changes.lift) {
		const row = active.find((candidate) => candidate.date === date);
		if (row) liftMissedDay(ctx, row, reason);
	}
}

export function syncHunter(ctx: ServiceContext, hunterId: string): void {
	inTransaction(ctx, () => {
		const timeline = hunterTimeline(ctx, hunterId);
		syncMissedDays(ctx, hunterId, timeline);
		syncBadges(ctx, hunterId, timeline);
	});
}

/** Auswertung für alle aktiven Hunter, z. B. um Mitternacht und beim Serverstart. */
export function evaluateAllHunters(ctx: ServiceContext): void {
	for (const hunter of listActiveHunters(ctx)) syncHunter(ctx, hunter.id);
	ctx.bus.publish(['board', 'feed', 'votes']);
}

// ---------- Abstimmungen ----------

function loadVote(ctx: ServiceContext, voteId: string): VoteRow {
	const vote = ctx.db.select().from(votes).where(eq(votes.id, voteId)).get();
	if (!vote) throw new ServiceError('not_found', 'Diese Abstimmung gibt es nicht.');
	return vote;
}

function voterIdsOf(ctx: ServiceContext, voteId: string): string[] {
	return ctx.db
		.select({ id: voteVoters.hunterId })
		.from(voteVoters)
		.where(eq(voteVoters.voteId, voteId))
		.all()
		.map((row) => row.id);
}

function ballotsOf(ctx: ServiceContext, voteId: string) {
	return ctx.db
		.select({ voterId: ballots.voterId, penaltyId: ballots.penaltyId })
		.from(ballots)
		.where(eq(ballots.voteId, voteId))
		.all();
}

function requireOpenVoteForVoter(ctx: ServiceContext, voterId: string, voteId: string): VoteRow {
	const vote = loadVote(ctx, voteId);
	if (vote.status !== 'open') throw new ServiceError('conflict', 'Diese Abstimmung ist schon beendet.');
	if (!voterIdsOf(ctx, voteId).includes(voterId)) {
		throw forbidden('Du bist bei dieser Abstimmung nicht stimmberechtigt.');
	}
	return vote;
}

function closeIfComplete(ctx: ServiceContext, vote: VoteRow): void {
	const voterIds = voterIdsOf(ctx, vote.id);
	if (voterIds.length === 0) {
		ctx.db.update(votes).set({ status: 'cancelled', closedAt: ctx.clock.now() }).where(eq(votes.id, vote.id)).run();
		return;
	}
	const result = tallyVote(voterIds, ballotsOf(ctx, vote.id), ctx.random);
	if (!result.closed || !result.winnerPenaltyId) return;

	const now = ctx.clock.now();
	const penalty = getPenalty(ctx, result.winnerPenaltyId);
	ctx.db
		.update(votes)
		.set({
			status: 'closed',
			closedAt: now,
			winnerPenaltyId: penalty.id,
			decidedByLot: result.decidedByLot
		})
		.where(eq(votes.id, vote.id))
		.run();
	ctx.db
		.insert(verdicts)
		.values({
			id: crypto.randomUUID(),
			voteId: vote.id,
			hunterId: vote.offenderId,
			date: vote.date,
			penaltyId: penalty.id,
			decidedAt: now,
			decidedByLot: result.decidedByLot,
			status: 'imposed'
		})
		.run();
	appendEvent(ctx, vote.offenderId, 'verdict', {
		date: vote.date,
		offenderId: vote.offenderId,
		penaltyId: penalty.id,
		penaltyTitle: penalty.title,
		decidedByLot: result.decidedByLot
	});
	syncBadges(ctx, vote.offenderId);
	for (const voterId of voterIds) syncBadges(ctx, voterId);
}

export function castBallot(
	ctx: ServiceContext,
	voterId: string,
	voteId: string,
	penaltyId: string
): VoteView {
	inTransaction(ctx, () => {
		const vote = requireOpenVoteForVoter(ctx, voterId, voteId);
		const penalty = getPenalty(ctx, penaltyId);
		if (penalty.archived) throw invalid('Diese Strafe ist archiviert und steht nicht mehr zur Wahl.');
		const castAt = ctx.clock.now();
		ctx.db
			.insert(ballots)
			.values({ voteId, voterId, penaltyId, castAt })
			.onConflictDoUpdate({ target: [ballots.voteId, ballots.voterId], set: { penaltyId, castAt } })
			.run();
		closeIfComplete(ctx, vote);
	});
	ctx.bus.publish(['votes', 'feed']);
	return getVoteView(ctx, voterId, voteId);
}

export function proposePenalty(
	ctx: ServiceContext,
	voterId: string,
	voteId: string,
	input: PenaltyInput
): Penalty {
	requireOpenVoteForVoter(ctx, voterId, voteId);
	return createPenalty(ctx, voterId, input);
}

function hunterRefs(ctx: ServiceContext, ids: string[]): Map<string, HunterRef> {
	if (ids.length === 0) return new Map();
	return new Map(
		ctx.db
			.select({ id: hunters.id, name: hunters.name, color: hunters.color })
			.from(hunters)
			.where(inArray(hunters.id, ids))
			.all()
			.map((row) => [row.id, row])
	);
}

function toVoteView(ctx: ServiceContext, viewerId: string, vote: VoteRow, options: Penalty[]): VoteView {
	const voterIds = voterIdsOf(ctx, vote.id);
	const cast = ballotsOf(ctx, vote.id);
	const refs = hunterRefs(ctx, [vote.offenderId, ...voterIds]);
	let counts: Record<string, number> | null = null;
	if (vote.status === 'closed') {
		counts = {};
		for (const ballot of cast) counts[ballot.penaltyId] = (counts[ballot.penaltyId] ?? 0) + 1;
	}
	return {
		id: vote.id,
		status: vote.status,
		date: vote.date,
		offender: refs.get(vote.offenderId) as HunterRef,
		voters: voterIds.map((id) => ({
			hunter: refs.get(id) as HunterRef,
			hasVoted: cast.some((ballot) => ballot.voterId === id)
		})),
		myBallot: cast.find((ballot) => ballot.voterId === viewerId)?.penaltyId ?? null,
		options,
		counts,
		winner: vote.winnerPenaltyId ? getPenalty(ctx, vote.winnerPenaltyId) : null,
		decidedByLot: vote.decidedByLot,
		createdAt: vote.createdAt,
		closedAt: vote.closedAt
	};
}

export function getVoteView(ctx: ServiceContext, viewerId: string, voteId: string): VoteView {
	return toVoteView(ctx, viewerId, loadVote(ctx, voteId), listPenalties(ctx));
}

export function listVotes(
	ctx: ServiceContext,
	viewerId: string,
	options: { status: 'open' | 'all' }
): VoteView[] {
	const rows = ctx.db
		.select()
		.from(votes)
		.where(options.status === 'open' ? eq(votes.status, 'open') : undefined)
		.orderBy(desc(votes.createdAt), desc(votes.date))
		.all();
	const penaltyOptions = listPenalties(ctx);
	return rows.map((vote) => toVoteView(ctx, viewerId, vote, penaltyOptions));
}

// ---------- Strafbuch ----------

export function listVerdicts(ctx: ServiceContext, options: { hunterId?: string } = {}): VerdictView[] {
	return ctx.db
		.select({
			verdict: verdicts,
			hunter: { id: hunters.id, name: hunters.name, color: hunters.color },
			penalty: penalties
		})
		.from(verdicts)
		.innerJoin(hunters, eq(verdicts.hunterId, hunters.id))
		.innerJoin(penalties, eq(verdicts.penaltyId, penalties.id))
		.where(options.hunterId ? eq(verdicts.hunterId, options.hunterId) : undefined)
		.orderBy(desc(verdicts.decidedAt))
		.all()
		.map(({ verdict, hunter, penalty }) => ({
			id: verdict.id,
			hunter,
			date: verdict.date,
			penalty,
			decidedAt: verdict.decidedAt,
			decidedByLot: verdict.decidedByLot,
			status: verdict.status,
			liftReason: verdict.liftReason
		}));
}

/** Noch aktive verpasste Tage anderer Hunter aus den letzten Tagen, für die WARNING-Meldung. */
export function recentMissedNotices(
	ctx: ServiceContext,
	viewerId: string,
	days = 3
): { id: string; hunterName: string; date: LocalDate }[] {
	const since = new Date(ctx.clock.now().getTime() - days * 86_400_000);
	return ctx.db
		.select({ id: missedDays.id, date: missedDays.date, hunterName: hunters.name, createdAt: missedDays.createdAt })
		.from(missedDays)
		.innerJoin(hunters, eq(missedDays.hunterId, hunters.id))
		.where(and(eq(missedDays.status, 'active'), ne(missedDays.hunterId, viewerId), gte(missedDays.createdAt, since)))
		.orderBy(desc(missedDays.createdAt))
		.all()
		.map(({ id, date, hunterName }) => ({ id, date, hunterName }));
}

// ---------- Erinnerungen und Deaktivierung ----------

/** Offene Abstimmungen je Stimmberechtigtem, in denen er noch nicht abgestimmt hat. */
function awaitingBallots(ctx: ServiceContext): Map<string, string[]> {
	const openVotes = ctx.db.select({ id: votes.id }).from(votes).where(eq(votes.status, 'open')).all();
	const pending = new Map<string, string[]>();
	for (const vote of openVotes) {
		const voted = new Set(ballotsOf(ctx, vote.id).map((ballot) => ballot.voterId));
		for (const voterId of voterIdsOf(ctx, vote.id)) {
			if (voted.has(voterId)) continue;
			pending.set(voterId, [...(pending.get(voterId) ?? []), vote.id]);
		}
	}
	return pending;
}

export function openVotesAwaiting(ctx: ServiceContext, hunterId: string): string[] {
	return awaitingBallots(ctx).get(hunterId) ?? [];
}

/** Stimmberechtigte ohne Stimme in offenen Abstimmungen, sofern sie Abstimmungs-Push erlauben. */
export function pendingVoteReminders(ctx: ServiceContext): { hunterId: string; voteIds: string[] }[] {
	const pending = awaitingBallots(ctx);
	if (pending.size === 0) return [];
	const allowed = new Set(
		ctx.db
			.select({ id: hunters.id })
			.from(hunters)
			.where(
				and(
					inArray(hunters.id, [...pending.keys()]),
					eq(hunters.active, true),
					eq(hunters.votePushEnabled, true)
				)
			)
			.all()
			.map((row) => row.id)
	);
	return [...pending.entries()]
		.filter(([hunterId]) => allowed.has(hunterId))
		.map(([hunterId, voteIds]) => ({ hunterId, voteIds }));
}

/** Entfernt einen Hunter aus allen offenen Abstimmungen, als Betroffenen und als Stimmberechtigten. */
export function removeHunterFromVotes(ctx: ServiceContext, hunterId: string): void {
	const now = ctx.clock.now();
	ctx.db
		.update(votes)
		.set({ status: 'cancelled', closedAt: now })
		.where(and(eq(votes.offenderId, hunterId), eq(votes.status, 'open')))
		.run();

	const affected = ctx.db
		.select({ vote: votes })
		.from(voteVoters)
		.innerJoin(votes, eq(voteVoters.voteId, votes.id))
		.where(and(eq(voteVoters.hunterId, hunterId), eq(votes.status, 'open')))
		.all()
		.map((row) => row.vote);
	for (const vote of affected) {
		ctx.db
			.delete(ballots)
			.where(and(eq(ballots.voteId, vote.id), eq(ballots.voterId, hunterId)))
			.run();
		ctx.db
			.delete(voteVoters)
			.where(and(eq(voteVoters.voteId, vote.id), eq(voteVoters.hunterId, hunterId)))
			.run();
		closeIfComplete(ctx, vote);
	}
}
