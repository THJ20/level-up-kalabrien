import { z } from 'zod';
import { EFFORTS, EXERCISES, isLocalDate } from '#lib/domain/index.ts';
import { REACTIONS } from './feed';

export const LocalDateSchema = z.string().refine(isLocalDate, 'Ungültiges Datum');
export const ExerciseSchema = z.enum(EXERCISES);
export const EffortSchema = z.enum(EFFORTS);
export const ReactionSchema = z.enum(REACTIONS);

const int = z.number().int();
const nullableNumber = z.number().nullable().optional();

export const SetBody = z.object({
	date: LocalDateSchema,
	exercise: ExerciseSchema,
	reps: int,
	clientId: z.string().max(100).optional()
});

export const SetPatch = z.object({ reps: int });

export const ProfilePatch = z.object({
	name: z.string().optional(),
	color: z.string().optional()
});

export const SettingsPatch = z.object({
	pushEnabled: z.boolean().optional(),
	reminderEnabled: z.boolean().optional(),
	reminderTime: z.string().optional(),
	votePushEnabled: z.boolean().optional(),
	soundEnabled: z.boolean().optional()
});

export const ExerciseBody = z.object({
	name: z.string(),
	kind: z.enum(['time', 'reps']),
	secondsPerRep: int.nullable().optional(),
	tracksDistance: z.boolean().optional(),
	isRunning: z.boolean().optional()
});

export const ExercisePatch = ExerciseBody.omit({ kind: true }).partial();

export const BonusBody = z.object({
	exerciseId: z.string(),
	date: LocalDateSchema,
	minutes: int.nullable().optional(),
	reps: int.nullable().optional(),
	effort: EffortSchema,
	distanceKm: nullableNumber,
	clientId: z.string().max(100).optional()
});

export const BonusPatch = z.object({
	minutes: int.nullable().optional(),
	reps: int.nullable().optional(),
	effort: EffortSchema.optional(),
	distanceKm: nullableNumber
});

export const PenaltyBody = z.object({
	title: z.string(),
	description: z.string().optional()
});

export const PenaltyPatch = PenaltyBody.partial();

export const BallotBody = z.object({ penaltyId: z.string() });

export const ReactionBody = z.object({ reaction: ReactionSchema });

export const PushSubscriptionBody = z.object({
	endpoint: z.string(),
	keys: z.object({ p256dh: z.string(), auth: z.string() })
});

export const RangeQuery = z.object({
	from: LocalDateSchema.optional(),
	to: LocalDateSchema.optional()
});

export const ArchivedQuery = z.object({ archived: z.enum(['0', '1']).optional() });
