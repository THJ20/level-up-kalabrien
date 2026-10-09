import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import {
	EXERCISES,
	emptyTotals,
	localDateOf,
	minutesOfDay,
	type Effort,
	type ExerciseTotals,
	type LocalDate
} from '$lib/domain';
import type { ServiceContext } from './context';
import { feedEvents, hunters, reactions } from './db/schema';
import { invalid, notFound } from './errors';
import type { HunterRef } from './hunters';

export const FEED_EVENT_TYPES = [
	'joined',
	'activity',
	'quest_complete',
	'level_up',
	'rank_up',
	'badge',
	'missed',
	'sick',
	'missed_lifted',
	'verdict'
] as const;
export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

export const REACTIONS = ['fire', 'muscle', 'laugh', 'eyes'] as const;
export type Reaction = (typeof REACTIONS)[number];

export interface BonusActivity {
	exercise: string;
	minutes: number | null;
	reps: number | null;
	effort: Effort;
	distanceKm: number | null;
	points: number;
}

export interface ActivityPayload {
	date: LocalDate;
	reps: ExerciseTotals;
	bonus: BonusActivity[];
}

export interface FeedItem {
	id: string;
	type: FeedEventType;
	createdAt: Date;
	hunter: HunterRef;
	payload: Record<string, unknown>;
	reactions: Record<Reaction, number>;
	myReactions: Reaction[];
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export function appendEvent(
	ctx: ServiceContext,
	hunterId: string,
	type: FeedEventType,
	payload: object
): string {
	const id = crypto.randomUUID();
	ctx.db
		.insert(feedEvents)
		.values({ id, type, hunterId, payload: JSON.stringify(payload), createdAt: ctx.clock.now() })
		.run();
	return id;
}

function hourBucket(ctx: ServiceContext, hunterId: string, date: LocalDate): string {
	const now = ctx.clock.now();
	const hour = String(Math.floor(minutesOfDay(now) / 60)).padStart(2, '0');
	return `${hunterId}|${date}|${localDateOf(now)}T${hour}`;
}

/** Fasst Sätze und Bonus-Einträge eines Hunters pro Challenge-Tag und Berliner Stunde zu einem Ereignis zusammen. */
export function recordActivity(
	ctx: ServiceContext,
	hunterId: string,
	activity: { date: LocalDate; reps?: Partial<ExerciseTotals>; bonus?: BonusActivity }
): void {
	const bucket = hourBucket(ctx, hunterId, activity.date);
	const existing = ctx.db.select().from(feedEvents).where(eq(feedEvents.bucket, bucket)).get();
	const payload: ActivityPayload = existing
		? (JSON.parse(existing.payload) as ActivityPayload)
		: { date: activity.date, reps: emptyTotals(), bonus: [] };
	for (const exercise of EXERCISES) payload.reps[exercise] += activity.reps?.[exercise] ?? 0;
	if (activity.bonus) payload.bonus.push(activity.bonus);

	if (existing) {
		ctx.db
			.update(feedEvents)
			.set({ payload: JSON.stringify(payload), createdAt: ctx.clock.now() })
			.where(eq(feedEvents.id, existing.id))
			.run();
	} else {
		ctx.db
			.insert(feedEvents)
			.values({
				id: crypto.randomUUID(),
				type: 'activity',
				hunterId,
				payload: JSON.stringify(payload),
				bucket,
				createdAt: ctx.clock.now()
			})
			.run();
	}
}

function emptyReactionCounts(): Record<Reaction, number> {
	return { fire: 0, muscle: 0, laugh: 0, eyes: 0 };
}

export function listFeed(
	ctx: ServiceContext,
	viewerId: string,
	options: { before?: number; limit?: number } = {}
): FeedItem[] {
	const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
	const rows = ctx.db
		.select({ event: feedEvents, hunter: { id: hunters.id, name: hunters.name, color: hunters.color } })
		.from(feedEvents)
		.innerJoin(hunters, eq(feedEvents.hunterId, hunters.id))
		.where(options.before !== undefined ? lt(feedEvents.createdAt, new Date(options.before)) : undefined)
		.orderBy(desc(feedEvents.createdAt), desc(feedEvents.id))
		.limit(limit)
		.all();
	if (rows.length === 0) return [];

	const reactionRows = ctx.db
		.select()
		.from(reactions)
		.where(
			inArray(
				reactions.eventId,
				rows.map((row) => row.event.id)
			)
		)
		.all();

	return rows.map(({ event, hunter }) => {
		const own = reactionRows.filter((reaction) => reaction.eventId === event.id);
		const counts = emptyReactionCounts();
		for (const reaction of own) counts[reaction.reaction] += 1;
		return {
			id: event.id,
			type: event.type as FeedEventType,
			createdAt: event.createdAt,
			hunter,
			payload: JSON.parse(event.payload) as Record<string, unknown>,
			reactions: counts,
			myReactions: REACTIONS.filter((reaction) =>
				own.some((row) => row.hunterId === viewerId && row.reaction === reaction)
			)
		};
	});
}

export function toggleReaction(
	ctx: ServiceContext,
	hunterId: string,
	eventId: string,
	reaction: Reaction
): { active: boolean } {
	if (!(REACTIONS as readonly string[]).includes(reaction)) throw invalid('Diese Reaktion gibt es nicht.');
	const event = ctx.db.select({ id: feedEvents.id }).from(feedEvents).where(eq(feedEvents.id, eventId)).get();
	if (!event) throw notFound('Diesen Feed-Eintrag gibt es nicht.');

	const match = and(
		eq(reactions.eventId, eventId),
		eq(reactions.hunterId, hunterId),
		eq(reactions.reaction, reaction)
	);
	const existing = ctx.db.select().from(reactions).where(match).get();
	if (existing) ctx.db.delete(reactions).where(match).run();
	else ctx.db.insert(reactions).values({ eventId, hunterId, reaction }).run();
	ctx.bus.publish(['feed']);
	return { active: !existing };
}
