import { CHALLENGE_DAYS } from './challenge';

export const XP_PER_QUEST = 100;
export const MAX_LEVEL = 51;
export const S_RANK_LEVEL = 50;
/** So viele Tage darf man verpassen und trotzdem vor dem Abflug den S-Rang erreichen. */
export const LEVEL_BUFFER_DAYS = 7;
export const S_RANK_QUESTS = CHALLENGE_DAYS - LEVEL_BUFFER_DAYS;
export const LEVEL_CURVE = 1.6;

export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Rank = (typeof RANKS)[number];

const EPSILON = 1e-9;

/** Erfüllte Quests, die für ein Level nötig sind (ungerundet). */
export function questsForLevel(level: number): number {
	if (level <= 1) return 0;
	return S_RANK_QUESTS * Math.pow((level - 1) / (S_RANK_LEVEL - 1), LEVEL_CURVE);
}

/** Ganze erfüllte Quests, ab denen das Level erreicht ist. */
export function questThreshold(level: number): number {
	return Math.ceil(questsForLevel(level) - EPSILON);
}

export function levelForQuests(quests: number): number {
	let level = 1;
	while (level < MAX_LEVEL && quests + EPSILON >= questsForLevel(level + 1)) level += 1;
	return level;
}

export function rankForLevel(level: number): Rank {
	if (level >= 50) return 'S';
	if (level >= 40) return 'A';
	if (level >= 30) return 'B';
	if (level >= 20) return 'C';
	if (level >= 10) return 'D';
	return 'E';
}

export interface LevelProgress {
	quests: number;
	xp: number;
	level: number;
	rank: Rank;
	levelStartXp: number;
	nextLevelXp: number | null;
	/** XP, die bis zum nächsten Level noch fehlen, in ganzen Quests gerechnet. */
	xpToNext: number | null;
	/** Anteil 0 bis 1 vom aktuellen bis zum nächsten Level. */
	progress: number;
}

export function levelProgress(quests: number): LevelProgress {
	const level = levelForQuests(quests);
	const xp = quests * XP_PER_QUEST;
	const levelStartXp = questsForLevel(level) * XP_PER_QUEST;
	const nextLevelXp = level < MAX_LEVEL ? questsForLevel(level + 1) * XP_PER_QUEST : null;
	const xpToNext = level < MAX_LEVEL ? Math.max(1, questThreshold(level + 1) - quests) * XP_PER_QUEST : null;
	const progress =
		nextLevelXp === null
			? 1
			: Math.min(1, Math.max(0, (xp - levelStartXp) / (nextLevelXp - levelStartXp)));
	return { quests, xp, level, rank: rankForLevel(level), levelStartXp, nextLevelXp, xpToNext, progress };
}
