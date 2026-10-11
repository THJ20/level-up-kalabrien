import { z } from 'zod';
import { EFFORTS, PLAN_UNITS, RATINGS, isLocalDate } from '#lib/domain/index.ts';
import { THEMES } from '../shared/constants';
import { REACTIONS } from './feed';

export const LocalDateSchema = z.string().refine(isLocalDate, 'Ungültiges Datum');
export const UnitSchema = z.enum(PLAN_UNITS);
export const EffortSchema = z.enum(EFFORTS);
export const ReactionSchema = z.enum(REACTIONS);

const int = z.number().int();
const nullableNumber = z.number().nullable().optional();

export const SetBody = z.object({
	date: LocalDateSchema,
	exerciseId: z.string().max(100),
	value: z.number(),
	clientId: z.string().max(100).optional()
});

export const SetPatch = z.object({ value: z.number() });

export const ProfilePatch = z.object({
	displayName: z.string().max(100).nullable().optional(),
	color: z.string().optional(),
	theme: z.enum(THEMES).optional()
});

export const AvatarPresetBody = z.object({ preset: z.string().max(10) });

export const RatingBody = z.object({ rating: z.enum(RATINGS) });

export const PromptBody = z.object({ notes: z.string().max(500).optional() });

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

export const PlanBody = z.object({
	items: z
		.array(
			z.object({
				exerciseId: z.string().max(100).optional(),
				newExercise: ExerciseBody.optional(),
				unit: UnitSchema,
				target: z.number()
			})
		)
		.max(30)
});

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
