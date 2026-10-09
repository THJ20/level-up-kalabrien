import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter } from './testing';
import { listFeed } from './feed';
import { addSet, deleteSet, listSets, reportSick, updateSet, withdrawSick } from './quest';

function setup(nowIso = '2026-10-09T10:00:00Z') {
	const ctx = createTestContext(nowIso);
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
	const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-09' });
	return { ctx, tobias, niklas };
}

function feedTypes(ctx: ReturnType<typeof setup>['ctx'], viewer: string) {
	return listFeed(ctx, viewer).map((item) => item.type);
}

describe('Sätze', () => {
	it('lassen sich anlegen, ändern und löschen', () => {
		const { ctx, tobias } = setup();
		const created = addSet(ctx, tobias, { date: '2026-10-09', exercise: 'pushups', reps: 25 });
		expect(created).toMatchObject({ hunterId: tobias, date: '2026-10-09', exercise: 'pushups', reps: 25 });
		expect(updateSet(ctx, tobias, created.id, { reps: 30 }).reps).toBe(30);
		deleteSet(ctx, tobias, created.id);
		expect(listSets(ctx, tobias, '2026-10-09')).toEqual([]);
	});

	it('gehören nur ihrem Hunter', () => {
		const { ctx, tobias, niklas } = setup();
		const created = addSet(ctx, tobias, { date: '2026-10-09', exercise: 'pushups', reps: 25 });
		expect(() => updateSet(ctx, niklas, created.id, { reps: 1 })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(() => deleteSet(ctx, niklas, created.id)).toThrow(expect.objectContaining({ code: 'forbidden' }));
		expect(() => deleteSet(ctx, tobias, 'unbekannt')).toThrow(expect.objectContaining({ code: 'not_found' }));
	});

	it('prüft Wiederholungen und Tag', () => {
		const { ctx, tobias } = setup('2026-10-12T10:00:00Z');
		const invalid = expect.objectContaining({ code: 'invalid_input' });
		expect(() => addSet(ctx, tobias, { date: '2026-10-12', exercise: 'pushups', reps: 0 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-13', exercise: 'pushups', reps: 10 })).toThrow(invalid);
		expect(() => addSet(ctx, tobias, { date: '2026-10-08', exercise: 'pushups', reps: 10 })).toThrow(invalid);
		expect(() =>
			addSet(ctx, tobias, { date: '2026-10-12', exercise: 'burpees' as 'pushups', reps: 10 })
		).toThrow(invalid);
		ctx.clock.set('2027-05-01T10:00:00Z');
		expect(() => addSet(ctx, tobias, { date: '2027-04-29', exercise: 'pushups', reps: 10 })).toThrow(invalid);
	});

	it('legt bei gleicher Client-ID keinen zweiten Satz an', () => {
		const { ctx, tobias } = setup();
		const first = addSet(ctx, tobias, { date: '2026-10-09', exercise: 'squats', reps: 20, clientId: 'c-1' });
		const second = addSet(ctx, tobias, { date: '2026-10-09', exercise: 'squats', reps: 20, clientId: 'c-1' });
		expect(second.id).toBe(first.id);
		expect(listSets(ctx, tobias, '2026-10-09')).toHaveLength(1);
	});

	it('meldet die erfüllte Quest und das Level-up genau einmal', () => {
		const { ctx, tobias } = setup();
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'pushups', reps: 100 });
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'squats', reps: 100 });
		expect(feedTypes(ctx, tobias)).not.toContain('quest_complete');
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'situps', reps: 100 });
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'situps', reps: 20 });

		const feed = listFeed(ctx, tobias);
		expect(feed.filter((item) => item.type === 'quest_complete')).toHaveLength(1);
		expect(feed.find((item) => item.type === 'quest_complete')?.payload).toEqual({
			date: '2026-10-09',
			backfilled: false
		});
		expect(feed.find((item) => item.type === 'level_up')?.payload).toEqual({ level: 2 });
	});

	it('schreibt Aktivität in den Feed und meldet Änderungen auf dem Bus', () => {
		const { ctx, tobias } = setup();
		addSet(ctx, tobias, { date: '2026-10-09', exercise: 'pushups', reps: 25 });
		expect(listFeed(ctx, tobias)[0]).toMatchObject({
			type: 'activity',
			payload: { reps: { pushups: 25, squats: 0, situps: 0 } }
		});
		expect(ctx.published.at(-1)).toEqual(['board', 'feed', 'votes']);
	});
});

describe('Krankmeldung', () => {
	it('erscheint im Feed, ist idempotent und lässt sich zurücknehmen', () => {
		const { ctx, tobias } = setup('2026-10-11T10:00:00Z');
		reportSick(ctx, tobias, '2026-10-10');
		reportSick(ctx, tobias, '2026-10-10');
		const sickEvents = listFeed(ctx, tobias).filter((item) => item.type === 'sick');
		expect(sickEvents).toHaveLength(1);
		expect(sickEvents[0].payload).toEqual({ date: '2026-10-10', backfilled: true });

		withdrawSick(ctx, tobias, '2026-10-10');
		reportSick(ctx, tobias, '2026-10-11');
		expect(listFeed(ctx, tobias).filter((item) => item.type === 'sick').at(0)?.payload).toEqual({
			date: '2026-10-11',
			backfilled: false
		});
	});
});
