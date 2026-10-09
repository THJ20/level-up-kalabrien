import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestContext, insertHunter } from './testing';
import { bonusEntries, exercises, questSets, settings, sickNotes } from './db/schema';
import { getHunter, getSettings, scoringStartOf, updateProfile, updateSettings } from './hunters';
import { hunterTimeline, loadHunterRecords } from './records';
import { appendEvent, listFeed, recordActivity, toggleReaction } from './feed';

describe('Hunter', () => {
	it('beginnt die Wertung mit dem späteren Datum aus Go-live und Registrierung', () => {
		const ctx = createTestContext('2026-10-20T10:00:00Z');
		ctx.db.update(settings).set({ value: '2026-10-14' }).where(eq(settings.key, 'go_live_date')).run();
		const early = getHunter(ctx, insertHunter(ctx, 'Früh', { registeredOn: '2026-10-09' }));
		const late = getHunter(ctx, insertHunter(ctx, 'Spät', { registeredOn: '2026-10-20' }));
		expect(scoringStartOf(ctx, early)).toBe('2026-10-14');
		expect(scoringStartOf(ctx, late)).toBe('2026-10-20');
	});

	it('hat Standard-Einstellungen und prüft die Uhrzeit', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		expect(getSettings(ctx, id)).toEqual({
			pushEnabled: true,
			reminderEnabled: true,
			reminderTime: '20:00',
			votePushEnabled: true,
			soundEnabled: false
		});
		expect(updateSettings(ctx, id, { reminderTime: '21:30', soundEnabled: true })).toMatchObject({
			reminderTime: '21:30',
			soundEnabled: true
		});
		expect(() => updateSettings(ctx, id, { reminderTime: '25:00' })).toThrow(/Uhrzeit/);
	});

	it('ändert Name und Farbe', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		insertHunter(ctx, 'Niklas');
		expect(updateProfile(ctx, id, { name: 'Tobi', color: '#4cc9ff' })).toMatchObject({
			name: 'Tobi',
			color: '#4cc9ff'
		});
		expect(() => updateProfile(ctx, id, { name: 'NIKLAS' })).toThrow(/gibt es schon/);
	});
});

describe('Rohdaten', () => {
	it('liefert Sätze, Krankmeldungen und Bonus-Einträge im Domänenformat', () => {
		const ctx = createTestContext('2026-10-11T10:00:00Z');
		const id = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
		const now = ctx.clock.now();
		ctx.db
			.insert(questSets)
			.values(
				(['pushups', 'squats', 'situps'] as const).map((exercise) => ({
					id: crypto.randomUUID(),
					hunterId: id,
					date: '2026-10-09',
					exercise,
					reps: 100,
					recordedAt: now
				}))
			)
			.run();
		ctx.db.insert(sickNotes).values({ id: 's1', hunterId: id, date: '2026-10-10', recordedAt: now }).run();
		const running = ctx.db.select().from(exercises).where(eq(exercises.isRunning, true)).get()!;
		ctx.db
			.insert(bonusEntries)
			.values({
				id: 'b1',
				hunterId: id,
				exerciseId: running.id,
				date: '2026-10-09',
				minutes: 30,
				effort: 'moderate',
				distanceKm: 5,
				bonusPoints: 150,
				recordedAt: now
			})
			.run();

		const records = loadHunterRecords(ctx, id);
		expect(records.scoringStart).toBe('2026-10-09');
		expect(records.sets).toHaveLength(3);
		expect(records.sickNotes).toEqual([{ date: '2026-10-10', recordedAt: now }]);
		expect(records.bonusEntries[0]).toMatchObject({ bonusPoints: 150, distanceKm: 5, isRunning: true });
		expect(hunterTimeline(ctx, id).map((day) => day.status)).toEqual(['fulfilled', 'sick', 'open']);
	});
});

describe('Feed', () => {
	it('bündelt Aktivität pro Hunter und Stunde', () => {
		const ctx = createTestContext('2026-10-09T10:05:00Z');
		const id = insertHunter(ctx, 'Tobias');
		recordActivity(ctx, id, { date: '2026-10-09', reps: { pushups: 20 } });
		ctx.clock.advance(20 * 60_000);
		recordActivity(ctx, id, { date: '2026-10-09', reps: { pushups: 25, squats: 10 } });
		let feed = listFeed(ctx, id);
		expect(feed).toHaveLength(1);
		expect(feed[0].payload).toEqual({
			date: '2026-10-09',
			reps: { pushups: 45, squats: 10, situps: 0 },
			bonus: []
		});

		ctx.clock.advance(60 * 60_000);
		recordActivity(ctx, id, {
			date: '2026-10-09',
			bonus: { exercise: 'Laufen/Joggen', minutes: 30, reps: null, effort: 'moderate', distanceKm: 5, points: 150 }
		});
		feed = listFeed(ctx, id);
		expect(feed).toHaveLength(2);
		expect(feed[0].payload).toMatchObject({ bonus: [{ exercise: 'Laufen/Joggen', points: 150 }] });
	});

	it('sortiert absteigend, blättert und zählt Reaktionen', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		const niklas = insertHunter(ctx, 'Niklas');
		const first = appendEvent(ctx, tobias, 'quest_complete', { date: '2026-10-09', backfilled: false });
		ctx.clock.advance(1000);
		const second = appendEvent(ctx, niklas, 'level_up', { level: 2 });

		const feed = listFeed(ctx, tobias);
		expect(feed.map((item) => item.id)).toEqual([second, first]);
		expect(feed[0].hunter.name).toBe('Niklas');
		expect(listFeed(ctx, tobias, { before: feed[0].createdAt.getTime() }).map((item) => item.id)).toEqual([first]);

		expect(toggleReaction(ctx, tobias, second, 'fire')).toEqual({ active: true });
		toggleReaction(ctx, niklas, second, 'fire');
		const reacted = listFeed(ctx, tobias)[0];
		expect(reacted.reactions.fire).toBe(2);
		expect(reacted.myReactions).toEqual(['fire']);
		expect(toggleReaction(ctx, tobias, second, 'fire')).toEqual({ active: false });
		expect(listFeed(ctx, tobias)[0].reactions.fire).toBe(1);
		expect(() => toggleReaction(ctx, tobias, 'unbekannt', 'fire')).toThrow();
	});
});
