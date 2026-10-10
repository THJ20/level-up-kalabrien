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
			addSet(ctx, tobias, { date: '2026-10-12', exerciseId: exercise, value: 100 });
		}
		const summary = hunterSummary(ctx, tobias);
		expect(summary).toMatchObject({
			today: '2026-10-12',
			dayNumber: 1,
			daysUntilDeparture: 199,
			level: { level: 2, rank: 'E' },
			streak: { current: 1, longest: 1 },
			openVotesForMe: 0
		});
		expect(summary.day?.status).toBe('fulfilled');
		expect(summary.badges.map((badge) => badge.badgeId)).toEqual(['awakened']);
	});

	it('zählt offene Abstimmungen, in denen ich noch abstimmen muss', () => {
		const ctx = createTestContext('2026-10-13T10:00:00Z');
		insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		seedFullDay(ctx, niklas, '2026-10-12');
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
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 100 });
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'squats', value: 150 });
		reportSick(ctx, niklas, '2026-10-12');

		const board = todayBoard(ctx);
		expect(board.map((row) => row.hunter.name)).toEqual(['Niklas', 'Tobias']);
		const row = board.find((entry) => entry.hunter.id === tobias);
		expect(row?.status).toBe('open');
		expect(row?.progress).toBeCloseTo(2 / 3, 6);
		expect(board.find((row) => row.hunter.id === niklas)?.status).toBe('sick');
	});
});

describe('Rangliste', () => {
	it('sortiert nach Level, dann BP, und filtert die Bonuswertung nach Zeitraum', () => {
		const ctx = createTestContext('2026-10-14T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		const ramzy = insertHunter(ctx, 'Ramzy', { registeredOn: '2026-10-12' });
		for (const hunter of [tobias, niklas]) {
			seedFullDay(ctx, hunter, '2026-10-12');
			seedFullDay(ctx, hunter, '2026-10-13');
		}
		seedFullDay(ctx, ramzy, '2026-10-12');
		const run = listExercises(ctx).find((exercise) => exercise.name === 'Laufen/Joggen')!;
		addBonusEntry(ctx, niklas, { exerciseId: run.id, date: '2026-10-12', minutes: 30, effort: 'hard' });
		addBonusEntry(ctx, tobias, { exerciseId: run.id, date: '2026-10-14', minutes: 10, effort: 'easy' });

		const board = leaderboard(ctx);
		expect(board.overall.map((row) => row.hunter.name)).toEqual(['Niklas', 'Tobias', 'Ramzy']);
		expect(board.overall[0]).toMatchObject({ level: 3, quests: 2, bonusPoints: 210 });
		expect(board.overall[2]).toMatchObject({ missedDays: 1 });

		const recent = leaderboard(ctx, { from: '2026-10-14', to: '2026-10-14' });
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
		const ctx = createTestContext('2026-10-14T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		seedFullDay(ctx, tobias, '2026-10-12');
		addSet(ctx, tobias, { date: '2026-10-13', exerciseId: 'pushups', value: 40 });

		const profile = hunterProfile(ctx, tobias);
		expect(profile.timeline.map((day) => day.status)).toEqual(['warmup', 'warmup', 'warmup', 'fulfilled', 'missed', 'open']);
		expect(profile.volume).toMatchObject({ reps: 340, minutes: 0, km: 0 });
		expect(profile.volume.byExercise[0]).toMatchObject({ exerciseId: 'pushups', total: 140 });
		expect(profile.plan.current.map((item) => item.exerciseId)).toEqual(['pushups', 'squats', 'situps']);

		const detail = dayDetail(ctx, tobias, '2026-10-13');
		expect(detail.sets.map((set) => [set.exerciseName, set.value])).toEqual([['Liegestütze', 40]]);
		expect(detail.day?.status).toBe('missed');
		expect(detail.sickReportedAt).toBeNull();

		const series = stats(ctx, { from: '2026-10-13', to: '2026-10-14' });
		expect(series.map((entry) => entry.hunter.name)).toEqual(['Niklas', 'Tobias']);
		expect(series[1].days.map((day) => [day.date, day.byExercise['pushups:reps'] ?? 0, day.reps])).toEqual([
			['2026-10-13', 40, 40],
			['2026-10-14', 0, 0]
		]);
		expect(series[1].exercises.map((exercise) => exercise.key)).toEqual(['pushups:reps', 'squats:reps', 'situps:reps']);
		expect(stats(ctx, { hunterIds: [niklas], from: '2026-10-12', to: '2026-10-12' })).toHaveLength(1);
		expect(() => stats(ctx, { from: '2026-10-14', to: '2026-10-13' })).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
	});
});
