import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestContext, insertHunter } from './testing';
import { bonusEntries, exercises, questSets, settings, sickNotes } from './db/schema';
import { getHunter, getSettings, scoringStartOf, updateProfile, updateSettings } from './hunters';
import { hunterTimeline, loadHunterRecords } from './records';
import { appendEvent, listFeed, recordActivity, toggleReaction } from './feed';

describe('Hunter', () => {
	it('beginnt die Wertung mit dem späteren Datum aus Go-live und Registrierung', () => {
		const ctx = createTestContext('2026-10-23T10:00:00Z');
		ctx.db.update(settings).set({ value: '2026-10-17' }).where(eq(settings.key, 'go_live_date')).run();
		const early = getHunter(ctx, insertHunter(ctx, 'Früh', { registeredOn: '2026-10-12' }));
		const late = getHunter(ctx, insertHunter(ctx, 'Spät', { registeredOn: '2026-10-23' }));
		expect(scoringStartOf(ctx, early)).toBe('2026-10-17');
		expect(scoringStartOf(ctx, late)).toBe('2026-10-23');
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

	it('setzt und löscht den Spielernamen, der Login-Name bleibt', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		const niklas = insertHunter(ctx, 'Niklas');
		expect(updateProfile(ctx, id, { displayName: '  Shadow  Tobi ', color: '#4cc9ff' })).toMatchObject({
			name: 'Shadow Tobi',
			loginName: 'Tobias',
			displayName: 'Shadow Tobi',
			color: '#4cc9ff'
		});
		expect(() => updateProfile(ctx, id, { displayName: 'NIKLAS' })).toThrow(/gibt es schon/);
		expect(() => updateProfile(ctx, niklas, { displayName: 'shadow tobi' })).toThrow(/gibt es schon/);
		expect(() => updateProfile(ctx, id, { displayName: 'x' })).toThrow(/2 bis 20/);
		expect(updateProfile(ctx, id, { displayName: null })).toMatchObject({ name: 'Tobias', displayName: null });
		expect(updateProfile(ctx, niklas, { displayName: 'Shadow Tobi' }).name).toBe('Shadow Tobi');
	});

	it('speichert das Farbschema', () => {
		const ctx = createTestContext();
		const id = insertHunter(ctx, 'Tobias');
		expect(getHunter(ctx, id).theme).toBe('monarch');
		expect(updateProfile(ctx, id, { theme: 'gate' }).theme).toBe('gate');
		expect(() => updateProfile(ctx, id, { theme: 'pink' as 'gate' })).toThrow(/Farbschema/);
	});
});

describe('Rohdaten', () => {
	it('liefert Sätze, Krankmeldungen und Bonus-Einträge im Domänenformat', () => {
		const ctx = createTestContext('2026-10-14T10:00:00Z');
		const id = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
		const now = ctx.clock.now();
		ctx.db
			.insert(questSets)
			.values(
				(['pushups', 'squats', 'situps'] as const).map((exerciseId) => ({
					id: crypto.randomUUID(),
					hunterId: id,
					date: '2026-10-12',
					exerciseId,
					value: 100,
					recordedAt: now
				}))
			)
			.run();
		ctx.db.insert(sickNotes).values({ id: 's1', hunterId: id, date: '2026-10-13', recordedAt: now }).run();
		const running = ctx.db.select().from(exercises).where(eq(exercises.isRunning, true)).get()!;
		ctx.db
			.insert(bonusEntries)
			.values({
				id: 'b1',
				hunterId: id,
				exerciseId: running.id,
				date: '2026-10-12',
				minutes: 30,
				effort: 'moderate',
				distanceKm: 5,
				bonusPoints: 150,
				recordedAt: now
			})
			.run();

		const records = loadHunterRecords(ctx, id);
		expect(records.scoringStart).toBe('2026-10-12');
		expect(records.sets).toHaveLength(3);
		expect(records.sickNotes).toEqual([{ date: '2026-10-13', recordedAt: now }]);
		expect(records.bonusEntries[0]).toMatchObject({ bonusPoints: 150, minutes: 30, distanceKm: 5, isRunning: true });
		expect(records.plans).toHaveLength(1);
		expect(hunterTimeline(ctx, id).map((day) => day.status)).toEqual(['warmup', 'warmup', 'warmup', 'fulfilled', 'sick', 'open']);
	});
});

describe('Feed', () => {
	it('bündelt Aktivität pro Hunter und Stunde', () => {
		const ctx = createTestContext('2026-10-12T10:05:00Z');
		const id = insertHunter(ctx, 'Tobias');
		const push = { exerciseId: 'pushups', name: 'Liegestütze', unit: 'reps' as const };
		recordActivity(ctx, id, { date: '2026-10-12', quest: { ...push, value: 20 } });
		ctx.clock.advance(20 * 60_000);
		recordActivity(ctx, id, { date: '2026-10-12', quest: { ...push, value: 25 } });
		recordActivity(ctx, id, {
			date: '2026-10-12',
			quest: { exerciseId: 'squats', name: 'Kniebeugen', unit: 'reps', value: 10 }
		});
		let feed = listFeed(ctx, id);
		expect(feed).toHaveLength(1);
		expect(feed[0].payload).toEqual({
			date: '2026-10-12',
			quest: [
				{ ...push, value: 45 },
				{ exerciseId: 'squats', name: 'Kniebeugen', unit: 'reps', value: 10 }
			],
			bonus: []
		});

		ctx.clock.advance(60 * 60_000);
		recordActivity(ctx, id, {
			date: '2026-10-12',
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
		const first = appendEvent(ctx, tobias, 'quest_complete', { date: '2026-10-12', backfilled: false });
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
