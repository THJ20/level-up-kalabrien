import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter } from './testing';
import { listFeed } from './feed';
import { savePlan } from './plans';
import { addSet, deleteSet, listSets, reportSick, updateSet, withdrawSick } from './quest';
import { listExercises } from './bonus';

function setup(nowIso = '2026-10-12T10:00:00Z') {
	const ctx = createTestContext(nowIso);
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
	const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
	return { ctx, tobias, niklas };
}

function feedTypes(ctx: ReturnType<typeof setup>['ctx'], viewer: string) {
	return listFeed(ctx, viewer).map((item) => item.type);
}

describe('Sätze', () => {
	it('lassen sich anlegen, ändern und löschen', () => {
		const { ctx, tobias } = setup();
		const created = addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 25 });
		expect(created).toMatchObject({ hunterId: tobias, date: '2026-10-12', exerciseId: 'pushups', value: 25 });
		expect(updateSet(ctx, tobias, created.id, { value: 30 }).value).toBe(30);
		deleteSet(ctx, tobias, created.id);
		expect(listSets(ctx, tobias, '2026-10-12')).toEqual([]);
	});

	it('gehören nur ihrem Hunter', () => {
		const { ctx, tobias, niklas } = setup();
		const created = addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 25 });
		expect(() => updateSet(ctx, niklas, created.id, { value: 1 })).toThrow(expect.objectContaining({ code: 'forbidden' }));
		expect(() => deleteSet(ctx, niklas, created.id)).toThrow(expect.objectContaining({ code: 'forbidden' }));
		expect(() => deleteSet(ctx, tobias, 'unbekannt')).toThrow(expect.objectContaining({ code: 'not_found' }));
	});

	it('prüft Wert, Tag und Übung im Plan', () => {
		const { ctx, tobias } = setup('2026-10-12T10:00:00Z');
		const invalid = expect.objectContaining({ code: 'invalid_input' });
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 0 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 501 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 2.5 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-13', exerciseId: 'pushups', value: 10 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-08', exerciseId: 'pushups', value: 10 })).toThrow(invalid);
		const burpees = listExercises(ctx).find((exercise) => exercise.name === 'Burpees')!;
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exerciseId: burpees.id, value: 10 })).toThrow(invalid);
		ctx.clock.set('2027-05-01T10:00:00Z');
		expect(() => addSet(ctx, tobias, { date: '2027-04-29', exerciseId: 'pushups', value: 10 })).toThrow(invalid);
	});

	it('erlaubt Einträge an Aufwärmtagen, ohne sie zu werten', () => {
		const { ctx, tobias } = setup('2026-10-12T10:00:00Z');
		for (const exerciseId of ['pushups', 'squats', 'situps']) {
			addSet(ctx, tobias, { date: '2026-10-10', exerciseId, value: 100 });
		}
		expect(listSets(ctx, tobias, '2026-10-10')).toHaveLength(3);
		expect(feedTypes(ctx, tobias)).not.toContain('quest_complete');
		expect(feedTypes(ctx, tobias)).not.toContain('level_up');
		expect(() => reportSick(ctx, tobias, '2026-10-10')).toThrow(expect.objectContaining({ code: 'invalid_input' }));
	});

	it('nimmt Kilometer nach dem Plan des Tages', () => {
		const { ctx, tobias } = setup('2026-10-12T10:00:00Z');
		const run = listExercises(ctx).find((exercise) => exercise.name === 'Laufen/Joggen')!;
		savePlan(ctx, tobias, [
			{ exerciseId: run.id, unit: 'km', target: 2.5 },
			{ exerciseId: 'pushups', unit: 'reps', target: 20 },
			{ exerciseId: 'squats', unit: 'reps', target: 20 }
		]);
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 20 });
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'squats', value: 20 });
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exerciseId: run.id, value: 1.25 })).toThrow(
			expect.objectContaining({ code: 'invalid_input' })
		);
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: run.id, value: 1.3 });
		expect(feedTypes(ctx, tobias)).not.toContain('quest_complete');
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: run.id, value: 1.2 });
		expect(feedTypes(ctx, tobias)).toContain('quest_complete');
	});

	it('legt bei gleicher Client-ID keinen zweiten Satz an', () => {
		const { ctx, tobias } = setup();
		const first = addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'squats', value: 20, clientId: 'c-1' });
		const second = addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'squats', value: 20, clientId: 'c-1' });
		expect(second.id).toBe(first.id);
		expect(listSets(ctx, tobias, '2026-10-12')).toHaveLength(1);
	});

	it('meldet die erfüllte Quest und das Level-up genau einmal', () => {
		const { ctx, tobias } = setup();
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 100 });
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'squats', value: 100 });
		expect(feedTypes(ctx, tobias)).not.toContain('quest_complete');
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'situps', value: 100 });
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'situps', value: 20 });

		const feed = listFeed(ctx, tobias);
		expect(feed.filter((item) => item.type === 'quest_complete')).toHaveLength(1);
		expect(feed.find((item) => item.type === 'quest_complete')?.payload).toEqual({
			date: '2026-10-12',
			backfilled: false
		});
		expect(feed.find((item) => item.type === 'level_up')?.payload).toEqual({ level: 2 });
	});

	it('schreibt Aktivität je Übung in den Feed und meldet Änderungen auf dem Bus', () => {
		const { ctx, tobias } = setup();
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 25 });
		addSet(ctx, tobias, { date: '2026-10-12', exerciseId: 'pushups', value: 15 });
		expect(listFeed(ctx, tobias)[0]).toMatchObject({
			type: 'activity',
			payload: { quest: [{ exerciseId: 'pushups', name: 'Liegestütze', unit: 'reps', value: 40 }], bonus: [] }
		});
		expect(ctx.published.at(-1)).toEqual(['board', 'feed', 'votes']);
	});
});

describe('Krankmeldung', () => {
	it('erscheint im Feed, ist idempotent und lässt sich zurücknehmen', () => {
		const { ctx, tobias } = setup('2026-10-14T10:00:00Z');
		reportSick(ctx, tobias, '2026-10-13');
		reportSick(ctx, tobias, '2026-10-13');
		const sickEvents = listFeed(ctx, tobias).filter((item) => item.type === 'sick');
		expect(sickEvents).toHaveLength(1);
		expect(sickEvents[0].payload).toEqual({ date: '2026-10-13', backfilled: true });

		withdrawSick(ctx, tobias, '2026-10-13');
		ctx.clock.advance(1000);
		reportSick(ctx, tobias, '2026-10-14');
		expect(listFeed(ctx, tobias).filter((item) => item.type === 'sick').at(0)?.payload).toEqual({
			date: '2026-10-14',
			backfilled: false
		});
	});
});
