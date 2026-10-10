import { sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const flag = (name: string) => integer(name, { mode: 'boolean' });

export const hunters = sqliteTable('hunters', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	nameKey: text('name_key').notNull().unique(),
	color: text('color').notNull(),
	passwordHash: text('password_hash').notNull(),
	role: text('role', { enum: ['admin', 'hunter'] }).notNull(),
	active: flag('active').notNull().default(true),
	registeredOn: text('registered_on').notNull(),
	createdAt: timestamp('created_at').notNull(),
	pushEnabled: flag('push_enabled').notNull().default(true),
	reminderEnabled: flag('reminder_enabled').notNull().default(true),
	reminderTime: text('reminder_time').notNull().default('20:00'),
	votePushEnabled: flag('vote_push_enabled').notNull().default(true),
	soundEnabled: flag('sound_enabled').notNull().default(false),
	lastReminderOn: text('last_reminder_on'),
	/** Frei gewählter Spielername, sonst gilt der Login-Name. */
	displayName: text('display_name'),
	displayNameKey: text('display_name_key').unique(),
	/** `preset:01` bis `preset:08` oder `upload:<datei>`. */
	avatar: text('avatar'),
	theme: text('theme', { enum: ['monarch', 'gate'] }).notNull().default('monarch')
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	hunterId: text('hunter_id')
		.notNull()
		.references(() => hunters.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at').notNull()
});

export const invites = sqliteTable('invites', {
	id: text('id').primaryKey(),
	tokenHash: text('token_hash').notNull().unique(),
	role: text('role', { enum: ['admin', 'hunter'] }).notNull(),
	createdBy: text('created_by').references(() => hunters.id),
	createdAt: timestamp('created_at').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	usedAt: timestamp('used_at'),
	usedBy: text('used_by').references(() => hunters.id)
});

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const questSets = sqliteTable(
	'quest_sets',
	{
		id: text('id').primaryKey(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		date: text('date').notNull(),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercises.id),
		/** Wert in der Einheit des Planpunkts dieser Übung am Tag. */
		value: real('value').notNull(),
		recordedAt: timestamp('recorded_at').notNull(),
		clientId: text('client_id')
	},
	(table) => [
		index('quest_sets_hunter_date').on(table.hunterId, table.date),
		uniqueIndex('quest_sets_client').on(table.hunterId, table.clientId)
	]
);

/** Version eines Trainingsplans. Sie gilt ab `valid_from`, bis eine neuere Version beginnt. */
export const plans = sqliteTable(
	'plans',
	{
		id: text('id').primaryKey(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		validFrom: text('valid_from').notNull(),
		/** Vom System angelegter Startplan, nicht vom Hunter gespeichert. */
		isDefault: flag('is_default').notNull().default(false),
		createdAt: timestamp('created_at').notNull()
	},
	(table) => [uniqueIndex('plans_hunter_valid_from').on(table.hunterId, table.validFrom)]
);

export const planItems = sqliteTable(
	'plan_items',
	{
		planId: text('plan_id')
			.notNull()
			.references(() => plans.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercises.id),
		unit: text('unit', { enum: ['reps', 'minutes', 'km'] }).notNull(),
		target: real('target').notNull()
	},
	(table) => [primaryKey({ columns: [table.planId, table.position] })]
);

export const sickNotes = sqliteTable(
	'sick_notes',
	{
		id: text('id').primaryKey(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		date: text('date').notNull(),
		recordedAt: timestamp('recorded_at').notNull()
	},
	(table) => [uniqueIndex('sick_notes_hunter_date').on(table.hunterId, table.date)]
);

export const exercises = sqliteTable('exercises', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	kind: text('kind', { enum: ['time', 'reps'] }).notNull(),
	secondsPerRep: integer('seconds_per_rep'),
	tracksDistance: flag('tracks_distance').notNull().default(false),
	isRunning: flag('is_running').notNull().default(false),
	createdBy: text('created_by').references(() => hunters.id),
	archived: flag('archived').notNull().default(false),
	createdAt: timestamp('created_at').notNull()
});

export const bonusEntries = sqliteTable(
	'bonus_entries',
	{
		id: text('id').primaryKey(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercises.id),
		date: text('date').notNull(),
		minutes: integer('minutes'),
		reps: integer('reps'),
		effort: text('effort', { enum: ['easy', 'moderate', 'hard', 'max'] }).notNull(),
		distanceKm: real('distance_km'),
		bonusPoints: real('bonus_points').notNull(),
		recordedAt: timestamp('recorded_at').notNull(),
		clientId: text('client_id')
	},
	(table) => [
		index('bonus_entries_hunter_date').on(table.hunterId, table.date),
		uniqueIndex('bonus_entries_client').on(table.hunterId, table.clientId)
	]
);

export const penalties = sqliteTable('penalties', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	createdBy: text('created_by')
		.notNull()
		.references(() => hunters.id),
	archived: flag('archived').notNull().default(false),
	createdAt: timestamp('created_at').notNull()
});

export const missedDays = sqliteTable(
	'missed_days',
	{
		id: text('id').primaryKey(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		date: text('date').notNull(),
		status: text('status', { enum: ['active', 'lifted'] }).notNull(),
		liftReason: text('lift_reason', { enum: ['backfill', 'sick'] }),
		createdAt: timestamp('created_at').notNull(),
		liftedAt: timestamp('lifted_at')
	},
	(table) => [
		uniqueIndex('missed_days_active')
			.on(table.hunterId, table.date)
			.where(sql`status = 'active'`)
	]
);

export const votes = sqliteTable('votes', {
	id: text('id').primaryKey(),
	missedDayId: text('missed_day_id')
		.notNull()
		.unique()
		.references(() => missedDays.id),
	offenderId: text('offender_id')
		.notNull()
		.references(() => hunters.id),
	date: text('date').notNull(),
	status: text('status', { enum: ['open', 'closed', 'cancelled'] }).notNull(),
	createdAt: timestamp('created_at').notNull(),
	closedAt: timestamp('closed_at'),
	winnerPenaltyId: text('winner_penalty_id').references(() => penalties.id),
	decidedByLot: flag('decided_by_lot').notNull().default(false)
});

export const voteVoters = sqliteTable(
	'vote_voters',
	{
		voteId: text('vote_id')
			.notNull()
			.references(() => votes.id),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id)
	},
	(table) => [primaryKey({ columns: [table.voteId, table.hunterId] })]
);

export const ballots = sqliteTable(
	'ballots',
	{
		voteId: text('vote_id')
			.notNull()
			.references(() => votes.id),
		voterId: text('voter_id')
			.notNull()
			.references(() => hunters.id),
		penaltyId: text('penalty_id')
			.notNull()
			.references(() => penalties.id),
		castAt: timestamp('cast_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.voteId, table.voterId] })]
);

export const verdicts = sqliteTable('verdicts', {
	id: text('id').primaryKey(),
	voteId: text('vote_id')
		.notNull()
		.unique()
		.references(() => votes.id),
	hunterId: text('hunter_id')
		.notNull()
		.references(() => hunters.id),
	date: text('date').notNull(),
	penaltyId: text('penalty_id')
		.notNull()
		.references(() => penalties.id),
	decidedAt: timestamp('decided_at').notNull(),
	decidedByLot: flag('decided_by_lot').notNull().default(false),
	status: text('status', { enum: ['imposed', 'lifted'] }).notNull(),
	liftReason: text('lift_reason', { enum: ['backfill', 'sick'] }),
	liftedAt: timestamp('lifted_at')
});

export const feedEvents = sqliteTable(
	'feed_events',
	{
		id: text('id').primaryKey(),
		type: text('type').notNull(),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		payload: text('payload').notNull(),
		bucket: text('bucket').unique(),
		createdAt: timestamp('created_at').notNull()
	},
	(table) => [index('feed_events_created').on(table.createdAt)]
);

export const reactions = sqliteTable(
	'reactions',
	{
		eventId: text('event_id')
			.notNull()
			.references(() => feedEvents.id, { onDelete: 'cascade' }),
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		reaction: text('reaction', { enum: ['fire', 'muscle', 'laugh', 'eyes'] }).notNull()
	},
	(table) => [primaryKey({ columns: [table.eventId, table.hunterId, table.reaction] })]
);

export const hunterBadges = sqliteTable(
	'hunter_badges',
	{
		hunterId: text('hunter_id')
			.notNull()
			.references(() => hunters.id),
		badgeId: text('badge_id').notNull(),
		earnedAt: timestamp('earned_at').notNull()
	},
	(table) => [primaryKey({ columns: [table.hunterId, table.badgeId] })]
);

export const pushSubscriptions = sqliteTable('push_subscriptions', {
	id: text('id').primaryKey(),
	hunterId: text('hunter_id')
		.notNull()
		.references(() => hunters.id),
	endpoint: text('endpoint').notNull().unique(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	createdAt: timestamp('created_at').notNull()
});
