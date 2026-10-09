import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter, seedFullDay } from './testing';
import { addBonusEntry, listExercises } from './bonus';
import { addSet, reportSick } from './quest';
import { evaluateAllHunters } from './votes';
import { dayDetail, hunterProfile, hunterSummary, leaderboard, stats, todayBoard } from './overview';

describe('Zusammenfassung', () => {
	it('zeigt Tag, Countdown, Level und Streak', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		for (const exercise of ['pushups', 'squats', 'situps'] as const) {
			addSet(ctx, tobias, { date: '2026-10-09', exercise, reps: 100 });
		}
		const summary = hunterSummary(ctx, tobias);
		expect(summary).toMatchObject({
			today: '2026-10-09',
			dayNumber: 1,
			daysUntilDeparture: 202,
			level: { level: 2, rank: 'E' },
			streak: { current: 1, longest: 1 },
			openVotesForMe: 0
		});
		expect(summary.day?.status).toBe('fulfilled');
		expect(summary.badges.map((badge) => badge.badgeId)).toEqual(['awakened']);
	});

	it('zählt offene Abstimmungen, in denen ich noch abstimmen muss', () => {
		const ctx = createTestContext('2026-10-10T10:00:00Z');
		insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-09' });
		seedFullDay(ctx, niklas, '2026-10-09');
		evaluateAllHunters(ctx);
		expect(hunterSummary(ctx, niklas).openVotesForMe).toBe(1);
	});
});

describe('Hunter heute', () => {
	it('listet alle aktiven Hunter mit gekapptem Fortschritt', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		const niklas = insertHunter(ctx, 'Niklas');
		insertHunter(ctx, 'Weg', { active: false });
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'pushups', reps: 100 });
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'squats', reps: 150 });
		reportSick(ctx, niklas, '2026-10-09');

		const board = todayBoard(ctx);
		expect(board.map((row) => row.hunter.name)).toEqual(['Niklas', 'Tobias']);
		expect(board.find((row) => row.hunter.id === tobias)).toMatchObject({
			status: 'open',
			progress: 200,
			totals: { pushups: 100, squats: 150, situps: 0 }
		});
		expect(board.find((row) => row.hunter.id === niklas)?.status).toBe('sick');
	});
});

describe('Rangliste', () => {
	it('sortiert nach Level, dann BP, und filtert die Bonuswertung nach Zeitraum', () => {
		const ctx = createTestContext('2026-10-11T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-09' });
		const ramzy = insertHunter(ctx, 'Ramzy', { registeredOn: '2026-10-09' });
		for (const hunter of [tobias, niklas]) {
			seedFullDay(ctx, hunter, '2026-10-09');
			seedFullDay(ctx, hunter, '2026-10-10');
		}
		seedFullDay(ctx, ramzy, '2026-10-09');
		const run = listExercises(ctx).find((exercise) => exercise.name === 'Laufen/Joggen')!;
		addBonusEntry(ctx, niklas, { exerciseId: run.id, date: '2026-10-09', minutes: 30, effort: 'hard' });
		addBonusEntry(ctx, tobias, { exerciseId: run.id, date: '2026-10-11', minutes: 10, effort: 'easy' });

		const board = leaderboard(ctx);
		expect(board.overall.map((row) => row.hunter.name)).toEqual(['Niklas', 'Tobias', 'Ramzy']);
		expect(board.overall[0]).toMatchObject({ level: 3, quests: 2, bonusPoints: 210 });
		expect(board.overall[2]).toMatchObject({ missedDays: 1 });

		const recent = leaderboard(ctx, { from: '2026-10-11', to: '2026-10-11' });
		expect(recent.bonus.map((row) => [row.hunter.name, row.periodBonusPoints])).toEqual([
			['Tobias', 30],
			['Niklas', 0],
			['Ramzy', 0]
		]);
		expect(recent.streaks[0].streak.current).toBe(2);
	});
});

describe('Statusfenster, Tagesdetail und Statistik', () => {
	it('liefern Kalender, Tagesdaten und Reihen im Zeitraum', () => {
		const ctx = createTestContext('2026-10-11T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-09' });
		seedFullDay(ctx, tobias, '2026-10-09');
		addSet(ctx, tobias, { date: '2026-10-10', exercise: 'pushups', reps: 40 });

		const profile = hunterProfile(ctx, tobias);
		expect(profile.timeline.map((day) => day.status)).toEqual(['fulfilled', 'missed', 'open']);
		expect(profile.volume).toEqual({ pushups: 140, squats: 100, situps: 100 });

		const detail = dayDetail(ctx, tobias, '2026-10-10');
		expect(detail.sets.map((set) => set.reps)).toEqual([40]);
		expect(detail.day?.status).toBe('missed');
		expect(detail.sickReportedAt).toBeNull();

		const series = stats(ctx, { from: '2026-10-10', to: '2026-10-11' });
		expect(series.map((entry) => entry.hunter.name)).toEqual(['Niklas', 'Tobias']);
		expect(series[1].days.map((day) => [day.date, day.totals.pushups])).toEqual([
			['2026-10-10', 40],
			['2026-10-11', 0]
		]);
		expect(stats(ctx, { hunterIds: [niklas], from: '2026-10-09', to: '2026-10-09' })).toHaveLength(1);
		expect(() => stats(ctx, { from: '2026-10-11', to: '2026-10-10' })).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
	});
});
