import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { todayOf } from '../context';
import { createTestContext } from '../testing';
import { runMigrations } from './migrate';
import { seedCatalog } from './seed';
import { exercises, questSets } from './schema';

const TABLES = [
	'ballots',
	'bonus_entries',
	'exercises',
	'feed_events',
	'hunter_badges',
	'hunters',
	'invites',
	'missed_days',
	'penalties',
	'plan_items',
	'plan_ratings',
	'plans',
	'push_subscriptions',
	'quest_sets',
	'reactions',
	'sessions',
	'settings',
	'sick_notes',
	'verdicts',
	'vote_voters',
	'votes'
];

describe('Datenbank', () => {
	it('legt alle Tabellen an und migriert nur einmal', () => {
		const ctx = createTestContext();
		const names = ctx.db.$client
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
			.pluck()
			.all() as string[];
		for (const table of TABLES) expect(names).toContain(table);

		runMigrations(ctx.db.$client, ctx.clock.now());
		const applied = ctx.db.$client.prepare('SELECT COUNT(*) FROM __migrations').pluck().get();
		expect(applied).toBe(4);
	});

	it('spielt den Startkatalog genau einmal ein', () => {
		const ctx = createTestContext();
		seedCatalog(ctx.db, ctx.clock.now());
		const all = ctx.db.select().from(exercises).all();
		expect(all).toHaveLength(18);
		expect(all.filter((exercise) => ['pushups', 'squats', 'situps'].includes(exercise.id)).map((exercise) => exercise.name)).toEqual([
			'Liegestütze',
			'Kniebeugen',
			'Sit-ups/Crunches'
		]);
		const running = ctx.db.select().from(exercises).where(eq(exercises.isRunning, true)).all();
		expect(running.map((exercise) => exercise.name)).toEqual(['Laufen/Joggen']);
	});

	it('prüft Fremdschlüssel', () => {
		const ctx = createTestContext();
		expect(() =>
			ctx.db
				.insert(questSets)
				.values({
					id: 'x',
					hunterId: 'unbekannt',
					date: '2026-10-12',
					exerciseId: 'pushups',
					value: 10,
					recordedAt: ctx.clock.now()
				})
				.run()
		).toThrow(/FOREIGN KEY/);
	});

	it('liefert den Berliner Kalendertag der Uhr', () => {
		const ctx = createTestContext('2026-10-12T22:30:00Z');
		expect(todayOf(ctx)).toBe('2026-10-13');
	});
});
