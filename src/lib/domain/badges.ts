import { CHALLENGE_DAYS, localDateOf, minutesOfDay } from './challenge';
import { EXERCISES, QUEST_TARGET, type Exercise } from './quest';
import {
	fulfilledDays,
	totalBonusPoints,
	volumeTotals,
	type BonusEntry,
	type DaySummary
} from './timeline';
import { streaks } from './streak';
import { RANKS, levelProgress } from './level';

export type BadgeId = string;
export type BadgeGroup = 'Durchhalten' | 'Rang' | 'Volumen' | 'Bonus' | 'Spaß';

export interface BadgeDefinition {
	id: BadgeId;
	name: string;
	group: BadgeGroup;
	description: string;
}

export interface BadgeContext {
	timeline: readonly DaySummary[];
	bonusEntries: readonly BonusEntry[];
	/** Verhängte, nicht aufgehobene Strafen des Hunters. */
	activeVerdicts: number;
	/** Abgegebene Stimmen des Hunters in beendeten Abstimmungen. */
	ballotsInClosedVotes: number;
}

const VOLUME_STEPS = [1_000, 5_000, 10_000, 20_000] as const;
const ROMAN = ['I', 'II', 'III', 'IV'] as const;
const VOLUME_NAMES: Record<Exercise, string> = {
	pushups: 'Liegestütze',
	squats: 'Kniebeugen',
	situps: 'Sit-ups'
};
const EARLY_BIRD_BEFORE = 8 * 60;
const LAST_MINUTE_FROM = 23 * 60;
const MARATHON_KM = 42.2;

export const BADGES: readonly BadgeDefinition[] = [
	{ id: 'awakened', name: 'Erwacht', group: 'Durchhalten', description: 'Erste Daily Quest erfüllt' },
	{ id: 'double-dungeon', name: 'Double Dungeon überlebt', group: 'Durchhalten', description: '7 Tage Streak' },
	{ id: 'relentless', name: 'Unermüdlich', group: 'Durchhalten', description: '30 Tage Streak' },
	{ id: 'unstoppable', name: 'Unaufhaltsam', group: 'Durchhalten', description: '100 Tage Streak' },
	{ id: 'arise', name: 'Arise', group: 'Durchhalten', description: '7 Tage am Stück nach einem verpassten Tag' },
	{ id: 'shadow-monarch', name: 'Shadow Monarch', group: 'Durchhalten', description: 'Alle 202 Tage erfüllt' },
	...RANKS.slice(1).map((rank) => ({
		id: `rank-${rank.toLowerCase()}`,
		name: `Rang ${rank}`,
		group: 'Rang' as const,
		description: `${rank}-Rang erreicht`
	})),
	...EXERCISES.flatMap((exercise) =>
		VOLUME_STEPS.map((step, index) => ({
			id: `${exercise}-${index + 1}`,
			name: `${VOLUME_NAMES[exercise]} ${ROMAN[index]}`,
			group: 'Volumen' as const,
			description: `${step.toLocaleString('de-DE')} ${VOLUME_NAMES[exercise]} gesamt`
		}))
	),
	{ id: 'overtime', name: 'Overtime', group: 'Bonus', description: 'Erstmals über 100 bei einer Pflichtübung' },
	{ id: 'extra-mile', name: 'Extra-Meile', group: 'Bonus', description: '1.000 BP gesamt' },
	{ id: 'gate-breaker', name: 'Gate-Brecher', group: 'Bonus', description: '10.000 BP gesamt' },
	{ id: 'monthly-marathon', name: 'Monatsmarathon', group: 'Bonus', description: '42,2 km Laufen in einem Kalendermonat' },
	{ id: 'early-bird', name: 'Frühaufsteher', group: 'Spaß', description: 'Daily Quest live vor 8 Uhr erfüllt' },
	{ id: 'last-minute', name: 'Last Minute', group: 'Spaß', description: 'Daily Quest live nach 23 Uhr erfüllt' },
	{ id: 'penalty-zone', name: 'Penalty Zone', group: 'Spaß', description: 'Erste Strafe kassiert' },
	{ id: 'judge', name: 'Richter', group: 'Spaß', description: '10 Stimmen abgegeben' }
];

function hasArise(timeline: readonly DaySummary[]): boolean {
	let afterMiss = false;
	let count = 0;
	for (const day of timeline) {
		if (day.status === 'missed') {
			afterMiss = true;
			count = 0;
		} else if (day.status === 'fulfilled' && afterMiss) {
			count += 1;
			if (count >= 7) return true;
		}
	}
	return false;
}

function hasMonthlyMarathon(entries: readonly BonusEntry[]): boolean {
	const kmByMonth = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.isRunning || entry.distanceKm === null) continue;
		const month = entry.date.slice(0, 7);
		kmByMonth.set(month, (kmByMonth.get(month) ?? 0) + entry.distanceKm);
	}
	return [...kmByMonth.values()].some((km) => km >= MARATHON_KM - 1e-9);
}

export function earnedBadges(context: BadgeContext): BadgeId[] {
	const { timeline } = context;
	const earned = new Set<BadgeId>();
	const quests = fulfilledDays(timeline);

	if (quests >= 1) earned.add('awakened');
	const { longest } = streaks(timeline);
	if (longest >= 7) earned.add('double-dungeon');
	if (longest >= 30) earned.add('relentless');
	if (longest >= 100) earned.add('unstoppable');
	if (hasArise(timeline)) earned.add('arise');
	if (quests === CHALLENGE_DAYS) earned.add('shadow-monarch');

	const rankIndex = RANKS.indexOf(levelProgress(quests).rank);
	for (const rank of RANKS.slice(1, rankIndex + 1)) earned.add(`rank-${rank.toLowerCase()}`);

	const volume = volumeTotals(timeline);
	for (const exercise of EXERCISES) {
		VOLUME_STEPS.forEach((step, index) => {
			if (volume[exercise] >= step) earned.add(`${exercise}-${index + 1}`);
		});
	}

	if (timeline.some((day) => EXERCISES.some((exercise) => day.totals[exercise] > QUEST_TARGET))) {
		earned.add('overtime');
	}
	const points = totalBonusPoints(timeline);
	if (points >= 1_000) earned.add('extra-mile');
	if (points >= 10_000) earned.add('gate-breaker');
	if (hasMonthlyMarathon(context.bonusEntries)) earned.add('monthly-marathon');

	for (const day of timeline) {
		if (day.status !== 'fulfilled' || !day.completedAt) continue;
		if (localDateOf(day.completedAt) !== day.date) continue;
		const minutes = minutesOfDay(day.completedAt);
		if (minutes < EARLY_BIRD_BEFORE) earned.add('early-bird');
		if (minutes >= LAST_MINUTE_FROM) earned.add('last-minute');
	}

	if (context.activeVerdicts >= 1) earned.add('penalty-zone');
	if (context.ballotsInClosedVotes >= 10) earned.add('judge');

	return BADGES.filter((badge) => earned.has(badge.id)).map((badge) => badge.id);
}
