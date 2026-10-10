import { CHALLENGE_DAYS, isWarmupDay, localDateOf, minutesOfDay } from './challenge';
import { fulfilledDays, totalBonusPoints, volumeOf, type BonusEntry, type DaySummary } from './timeline';
import { streaks } from './streak';
import { levelForQuests } from './level';

export type BadgeId = string;
export type BadgeGroup = 'Durchhalten' | 'Rang' | 'Volumen' | 'Bonus' | 'Spaß';
export const BADGE_GROUPS: readonly BadgeGroup[] = ['Durchhalten', 'Rang', 'Volumen', 'Bonus', 'Spaß'];

export interface BadgeContext {
	timeline: readonly DaySummary[];
	bonusEntries: readonly BonusEntry[];
	/** Verhängte, nicht aufgehobene Strafen des Hunters. */
	activeVerdicts: number;
	/** Abgegebene Stimmen des Hunters in beendeten Abstimmungen. */
	ballotsInClosedVotes: number;
	/** Wie oft der Hunter selbst einen Trainingsplan gespeichert hat. */
	planSaves: number;
}

/** Messwerte, aus denen sich alle Badges ableiten. */
export interface BadgeMetrics {
	quests: number;
	level: number;
	longestStreak: number;
	/** Längste Folge erfüllter Tage nach einem verpassten Tag. */
	comeback: number;
	reps: number;
	minutes: number;
	km: number;
	bonusPoints: number;
	overtime: number;
	/** Meiste Lauf-Kilometer in einem Kalendermonat. */
	monthlyRunKm: number;
	earlyBird: number;
	lastMinute: number;
	verdicts: number;
	ballots: number;
	planSaves: number;
}

export interface BadgeDefinition {
	id: BadgeId;
	name: string;
	group: BadgeGroup;
	/** Wie man den Badge bekommt. */
	description: string;
	/** Name des Lucide-Icons. */
	icon: string;
	target: number;
	/** Einheit für die Fortschrittsanzeige, leer bei Ja-nein-Badges. */
	unit: string;
	measure: (metrics: BadgeMetrics) => number;
}

const EARLY_BIRD_BEFORE = 8 * 60;
const LAST_MINUTE_FROM = 23 * 60;
const MARATHON_KM = 42.2;

function badge(definition: BadgeDefinition): BadgeDefinition {
	return definition;
}

const RANK_BADGES = [
	{ rank: 'D', level: 10, icon: 'Shield' },
	{ rank: 'C', level: 20, icon: 'ShieldPlus' },
	{ rank: 'B', level: 30, icon: 'ShieldCheck' },
	{ rank: 'A', level: 40, icon: 'Sword' },
	{ rank: 'S', level: 50, icon: 'Gem' }
] as const;

const REPS_BADGES = [
	{ step: 5_000, icon: 'Dumbbell' },
	{ step: 15_000, icon: 'BicepsFlexed' },
	{ step: 30_000, icon: 'Weight' },
	{ step: 50_000, icon: 'MountainSnow' }
] as const;

const ROMAN = ['I', 'II', 'III', 'IV'] as const;

function format(value: number): string {
	return value.toLocaleString('de-DE');
}

export const BADGES: readonly BadgeDefinition[] = [
	badge({
		id: 'awakened',
		name: 'Erwacht',
		group: 'Durchhalten',
		description: 'Erfülle deine erste Daily Quest.',
		icon: 'Sunrise',
		target: 1,
		unit: 'Quests',
		measure: (m) => m.quests
	}),
	badge({
		id: 'double-dungeon',
		name: 'Double Dungeon überlebt',
		group: 'Durchhalten',
		description: 'Erfülle 7 Tage am Stück.',
		icon: 'Castle',
		target: 7,
		unit: 'Tage',
		measure: (m) => m.longestStreak
	}),
	badge({
		id: 'relentless',
		name: 'Unermüdlich',
		group: 'Durchhalten',
		description: 'Erfülle 30 Tage am Stück.',
		icon: 'Flame',
		target: 30,
		unit: 'Tage',
		measure: (m) => m.longestStreak
	}),
	badge({
		id: 'unstoppable',
		name: 'Unaufhaltsam',
		group: 'Durchhalten',
		description: 'Erfülle 100 Tage am Stück.',
		icon: 'Rocket',
		target: 100,
		unit: 'Tage',
		measure: (m) => m.longestStreak
	}),
	badge({
		id: 'arise',
		name: 'Arise',
		group: 'Durchhalten',
		description: 'Komm nach einem verpassten Tag zurück und erfülle danach 7 Tage am Stück.',
		icon: 'Ghost',
		target: 7,
		unit: 'Tage',
		measure: (m) => m.comeback
	}),
	badge({
		id: 'shadow-monarch',
		name: 'Shadow Monarch',
		group: 'Durchhalten',
		description: `Erfülle alle ${CHALLENGE_DAYS} Tage der Challenge.`,
		icon: 'Crown',
		target: CHALLENGE_DAYS,
		unit: 'Quests',
		measure: (m) => m.quests
	}),
	...RANK_BADGES.map(({ rank, level, icon }) =>
		badge({
			id: `rank-${rank.toLowerCase()}`,
			name: `Rang ${rank}`,
			group: 'Rang',
			description: `Erreiche Level ${level} und damit den ${rank}-Rang.`,
			icon,
			target: level,
			unit: 'Level',
			measure: (m) => m.level
		})
	),
	...REPS_BADGES.map(({ step, icon }, index) =>
		badge({
			id: `reps-${index + 1}`,
			name: `Wiederholungen ${ROMAN[index]}`,
			group: 'Volumen',
			description: `Schaffe insgesamt ${format(step)} Wiederholungen in Daily Quest und Zusatzübungen.`,
			icon,
			target: step,
			unit: 'Wdh.',
			measure: (m) => m.reps
		})
	),
	badge({
		id: 'minutes-1',
		name: 'Ausdauer I',
		group: 'Volumen',
		description: 'Trainiere insgesamt 500 Minuten mit Zeit-Übungen in Daily Quest und Zusatzübungen.',
		icon: 'Timer',
		target: 500,
		unit: 'Min.',
		measure: (m) => m.minutes
	}),
	badge({
		id: 'minutes-2',
		name: 'Ausdauer II',
		group: 'Volumen',
		description: 'Trainiere insgesamt 2.000 Minuten mit Zeit-Übungen in Daily Quest und Zusatzübungen.',
		icon: 'Hourglass',
		target: 2_000,
		unit: 'Min.',
		measure: (m) => m.minutes
	}),
	badge({
		id: 'distance-1',
		name: 'Strecke I',
		group: 'Volumen',
		description: 'Leg insgesamt 50 km zurück, in Daily Quest und Zusatzübungen.',
		icon: 'Footprints',
		target: 50,
		unit: 'km',
		measure: (m) => m.km
	}),
	badge({
		id: 'distance-2',
		name: 'Strecke II',
		group: 'Volumen',
		description: 'Leg insgesamt 200 km zurück, in Daily Quest und Zusatzübungen.',
		icon: 'Route',
		target: 200,
		unit: 'km',
		measure: (m) => m.km
	}),
	badge({
		id: 'overtime',
		name: 'Overtime',
		group: 'Bonus',
		description: 'Übertriff an einem gewerteten Tag erstmals das Ziel eines Planpunkts.',
		icon: 'Zap',
		target: 1,
		unit: '',
		measure: (m) => m.overtime
	}),
	badge({
		id: 'extra-mile',
		name: 'Extra-Meile',
		group: 'Bonus',
		description: 'Sammle insgesamt 1.000 Bonuspunkte.',
		icon: 'Milestone',
		target: 1_000,
		unit: 'BP',
		measure: (m) => m.bonusPoints
	}),
	badge({
		id: 'gate-breaker',
		name: 'Gate-Brecher',
		group: 'Bonus',
		description: 'Sammle insgesamt 10.000 Bonuspunkte.',
		icon: 'Hammer',
		target: 10_000,
		unit: 'BP',
		measure: (m) => m.bonusPoints
	}),
	badge({
		id: 'monthly-marathon',
		name: 'Monatsmarathon',
		group: 'Bonus',
		description: 'Lauf in einem Kalendermonat zusammen 42,2 km (Zusatzübungen, die als Laufen zählen).',
		icon: 'Medal',
		target: MARATHON_KM,
		unit: 'km',
		measure: (m) => m.monthlyRunKm
	}),
	badge({
		id: 'early-bird',
		name: 'Frühaufsteher',
		group: 'Spaß',
		description: 'Erfülle eine Daily Quest live vor 8 Uhr morgens.',
		icon: 'Bird',
		target: 1,
		unit: '',
		measure: (m) => m.earlyBird
	}),
	badge({
		id: 'last-minute',
		name: 'Last Minute',
		group: 'Spaß',
		description: 'Erfülle eine Daily Quest live nach 23 Uhr.',
		icon: 'AlarmClock',
		target: 1,
		unit: '',
		measure: (m) => m.lastMinute
	}),
	badge({
		id: 'penalty-zone',
		name: 'Penalty Zone',
		group: 'Spaß',
		description: 'Kassiere deine erste Strafe.',
		icon: 'Gavel',
		target: 1,
		unit: '',
		measure: (m) => m.verdicts
	}),
	badge({
		id: 'judge',
		name: 'Richter',
		group: 'Spaß',
		description: 'Gib in beendeten Strafabstimmungen 10 Stimmen ab.',
		icon: 'Scale',
		target: 10,
		unit: 'Stimmen',
		measure: (m) => m.ballots
	}),
	badge({
		id: 'architect',
		name: 'Architekt',
		group: 'Spaß',
		description: 'Speichere deinen eigenen Trainingsplan.',
		icon: 'ScrollText',
		target: 1,
		unit: '',
		measure: (m) => m.planSaves
	})
];

function comebackRun(timeline: readonly DaySummary[]): number {
	let afterMiss = false;
	let run = 0;
	let best = 0;
	for (const day of timeline) {
		if (day.status === 'missed') {
			afterMiss = true;
			run = 0;
		} else if (day.status === 'fulfilled' && afterMiss) {
			run += 1;
			best = Math.max(best, run);
		}
	}
	return best;
}

function monthlyRunKm(entries: readonly BonusEntry[]): number {
	const kmByMonth = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.isRunning || entry.distanceKm === null) continue;
		const month = entry.date.slice(0, 7);
		kmByMonth.set(month, (kmByMonth.get(month) ?? 0) + entry.distanceKm);
	}
	return Math.round(Math.max(0, ...kmByMonth.values()) * 10) / 10;
}

export function badgeMetrics(context: BadgeContext): BadgeMetrics {
	const { timeline } = context;
	const quests = fulfilledDays(timeline);
	const volume = volumeOf(timeline, context.bonusEntries);
	const scored = timeline.filter((day) => day.status !== 'warmup');
	let earlyBird = 0;
	let lastMinute = 0;
	for (const day of scored) {
		if (day.status !== 'fulfilled' || !day.completedAt) continue;
		if (localDateOf(day.completedAt) !== day.date) continue;
		const minutes = minutesOfDay(day.completedAt);
		if (minutes < EARLY_BIRD_BEFORE) earlyBird += 1;
		if (minutes >= LAST_MINUTE_FROM) lastMinute += 1;
	}
	const overtime = scored.some((day) =>
		day.plan.some((item) => (day.totals[item.exerciseId] ?? 0) > item.target + 1e-9)
	);
	return {
		quests,
		level: levelForQuests(quests),
		longestStreak: streaks(timeline).longest,
		comeback: comebackRun(timeline),
		reps: volume.reps,
		minutes: volume.minutes,
		km: volume.km,
		bonusPoints: totalBonusPoints(timeline),
		overtime: overtime ? 1 : 0,
		monthlyRunKm: monthlyRunKm(context.bonusEntries.filter((entry) => !isWarmupDay(entry.date))),
		earlyBird,
		lastMinute,
		verdicts: context.activeVerdicts,
		ballots: context.ballotsInClosedVotes,
		planSaves: context.planSaves
	};
}

export interface BadgeProgress {
	current: number;
	target: number;
	earned: boolean;
}

export function badgeProgress(context: BadgeContext): Record<BadgeId, BadgeProgress> {
	const metrics = badgeMetrics(context);
	const result: Record<BadgeId, BadgeProgress> = {};
	for (const definition of BADGES) {
		const current = definition.measure(metrics);
		result[definition.id] = { current, target: definition.target, earned: current + 1e-9 >= definition.target };
	}
	return result;
}

export function earnedBadges(context: BadgeContext): BadgeId[] {
	const progress = badgeProgress(context);
	return BADGES.filter((definition) => progress[definition.id].earned).map((definition) => definition.id);
}
