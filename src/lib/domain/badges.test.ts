import { describe, expect, it } from 'vitest';
import { startOfDay } from './challenge';
import { BADGES, earnedBadges, type BadgeContext } from './badges';
import type { BonusEntry, DaySummary } from './timeline';
import { repeat, timelineOf } from './test-helpers';

function context(timeline: DaySummary[], partial: Partial<BadgeContext> = {}): BadgeContext {
	return { timeline, bonusEntries: [], activeVerdicts: 0, ballotsInClosedVotes: 0, ...partial };
}

function run(date: string, distanceKm: number, isRunning = true): BonusEntry {
	return {
		id: `run-${date}-${distanceKm}`,
		date,
		bonusPoints: 100,
		distanceKm,
		isRunning,
		recordedAt: new Date(startOfDay(date).getTime() + 18 * 3_600_000)
	};
}

describe('Badge-Katalog', () => {
	it('hat eindeutige IDs', () => {
		const ids = BADGES.map((badge) => badge.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('Durchhalten', () => {
	it('vergibt Erwacht ab der ersten erfüllten Quest', () => {
		expect(earnedBadges(context(timelineOf(['missed'])))).not.toContain('awakened');
		expect(earnedBadges(context(timelineOf(['fulfilled'])))).toContain('awakened');
	});

	it('vergibt Streak-Badges nach längstem Streak', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 6))))).not.toContain('double-dungeon');
		const badges = earnedBadges(context(timelineOf([...repeat('fulfilled', 30), 'missed'])));
		expect(badges).toContain('double-dungeon');
		expect(badges).toContain('relentless');
		expect(badges).not.toContain('unstoppable');
	});

	it('vergibt Arise für 7 erfüllte Tage nach einem verpassten Tag, Kranktage pausieren', () => {
		expect(
			earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 3), 'sick', ...repeat('fulfilled', 4)])))
		).toContain('arise');
		expect(earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 6)])))).not.toContain('arise');
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 7))))).not.toContain('arise');
		expect(
			earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 3), 'missed', ...repeat('fulfilled', 4)])))
		).not.toContain('arise');
	});

	it('vergibt Shadow Monarch nur für alle 202 Tage', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 202))))).toContain('shadow-monarch');
		expect(
			earnedBadges(context(timelineOf([...repeat('fulfilled', 201), 'sick'])))
		).not.toContain('shadow-monarch');
	});
});

describe('Rang und Volumen', () => {
	it('vergibt Rang-Badges ab dem erreichten Rang', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 12))))).not.toContain('rank-d');
		const badges = earnedBadges(context(timelineOf(repeat('fulfilled', 13))));
		expect(badges).toContain('rank-d');
		expect(badges).not.toContain('rank-c');
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 202))))).toContain('rank-s');
	});

	it('vergibt Volumen-Stufen je Pflichtübung', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 9))))).not.toContain('pushups-1');
		const badges = earnedBadges(context(timelineOf(repeat('fulfilled', 10))));
		expect(badges).toContain('pushups-1');
		expect(badges).toContain('squats-1');
		expect(badges).toContain('situps-1');
		expect(badges).not.toContain('pushups-2');
	});
});

describe('Bonus', () => {
	it('vergibt Overtime für mehr als 100 an einem Tag', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(earnedBadges(context(timeline))).not.toContain('overtime');
		timeline[0].totals.pushups = 101;
		expect(earnedBadges(context(timeline))).toContain('overtime');
	});

	it('vergibt Extra-Meile und Gate-Brecher nach Gesamt-BP', () => {
		const timeline = timelineOf(['fulfilled', 'fulfilled']);
		timeline[0].bonusPoints = 999;
		expect(earnedBadges(context(timeline))).not.toContain('extra-mile');
		timeline[1].overtimePoints = 1;
		expect(earnedBadges(context(timeline))).toContain('extra-mile');
		timeline[1].bonusPoints = 9_000;
		expect(earnedBadges(context(timeline))).toContain('gate-breaker');
	});

	it('vergibt den Monatsmarathon für 42,2 km Laufen in einem Kalendermonat', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-03', 20), run('2026-11-20', 22.2)] }))
		).toContain('monthly-marathon');
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-30', 20), run('2026-12-01', 22.2)] }))
		).not.toContain('monthly-marathon');
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-03', 50, false)] }))
		).not.toContain('monthly-marathon');
	});
});

describe('Spaß', () => {
	it('vergibt Frühaufsteher und Last Minute nur für live erfüllte Quests', () => {
		const early = timelineOf(['fulfilled']);
		early[0].completedAt = new Date(startOfDay(early[0].date).getTime() + (7 * 60 + 59) * 60_000);
		expect(earnedBadges(context(early))).toContain('early-bird');

		const late = timelineOf(['fulfilled']);
		late[0].completedAt = new Date(startOfDay(late[0].date).getTime() + (23 * 60 + 30) * 60_000);
		expect(earnedBadges(context(late))).toContain('last-minute');

		const backfilled = timelineOf(['fulfilled']);
		backfilled[0].completedAt = new Date(startOfDay(backfilled[0].date).getTime() + 31 * 3_600_000);
		const badges = earnedBadges(context(backfilled));
		expect(badges).not.toContain('early-bird');
		expect(badges).not.toContain('last-minute');
	});

	it('vergibt Penalty Zone und Richter', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(earnedBadges(context(timeline, { activeVerdicts: 1 }))).toContain('penalty-zone');
		expect(earnedBadges(context(timeline, { ballotsInClosedVotes: 9 }))).not.toContain('judge');
		expect(earnedBadges(context(timeline, { ballotsInClosedVotes: 10 }))).toContain('judge');
	});
});
