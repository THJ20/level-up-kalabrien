import { describe, expect, it } from 'vitest';
import { addDays, type LocalDate } from '#lib/domain/index.ts';
import { createTestContext, insertHunter, seedFullDay } from './testing';
import { listFeed } from './feed';
import { savePlan } from './plans';
import {
	applyWeeklyProgression,
	planPrompt,
	progressionOverview,
	rateWeek,
	upgradeNotice,
	weekRating
} from './progression';
import { addSet } from './quest';
import { planSaveCount, storedPlanOn } from './records';
import { questSets } from './db/schema';

function setup(nowIso = '2026-10-18T12:00:00Z') {
	const ctx = createTestContext(nowIso);
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
	return { ctx, tobias };
}

function fulfill(ctx: ReturnType<typeof setup>['ctx'], hunterId: string, from: LocalDate, days: number, value = 100) {
	for (let index = 0; index < days; index++) {
		if (value === 100) seedFullDay(ctx, hunterId, addDays(from, index));
		else
			ctx.db
				.insert(questSets)
				.values(
					['pushups', 'squats', 'situps'].map((exerciseId) => ({
						id: crypto.randomUUID(),
						hunterId,
						date: addDays(from, index),
						exerciseId,
						value,
						recordedAt: ctx.clock.now()
					}))
				)
				.run();
	}
}

const targets = (ctx: ReturnType<typeof setup>['ctx'], hunterId: string, date: LocalDate) =>
	storedPlanOn(ctx, hunterId, date)?.items.map((item) => item.target);

describe('Bewertung', () => {
	it('gilt für die laufende Woche, ersetzt die alte und bleibt privat', () => {
		const { ctx, tobias } = setup();
		rateWeek(ctx, tobias, 'too_easy');
		expect(rateWeek(ctx, tobias, 'too_hard').rating).toBe('too_hard');
		expect(weekRating(ctx, tobias, '2026-10-12')).toBe('too_hard');
		expect(listFeed(ctx, tobias).some((item) => JSON.stringify(item.payload).includes('too_'))).toBe(false);
		expect(() => rateWeek(ctx, tobias, 'super' as 'right')).toThrow(expect.objectContaining({ code: 'invalid_input' }));
	});

	it('fragt sonntags nach, solange noch nicht bewertet', () => {
		const { ctx, tobias } = setup('2026-10-18T12:00:00Z');
		expect(progressionOverview(ctx, tobias).checkinDue).toBe(true);
		rateWeek(ctx, tobias, 'right');
		expect(progressionOverview(ctx, tobias).checkinDue).toBe(false);
		ctx.clock.set('2026-10-17T12:00:00Z');
		expect(progressionOverview(ctx, tobias).checkinDue).toBe(false);
	});
});

describe('Wochensteigerung', () => {
	it('steigert montags nach Bewertung und zeigt den Hinweis einmal', () => {
		const { ctx, tobias } = setup();
		fulfill(ctx, tobias, '2026-10-12', 6);
		rateWeek(ctx, tobias, 'too_easy');
		ctx.clock.set('2026-10-18T22:30:00Z');
		expect(applyWeeklyProgression(ctx)).toEqual([tobias]);
		expect(targets(ctx, tobias, '2026-10-19')).toEqual([110, 110, 110]);
		expect(targets(ctx, tobias, '2026-10-18')).toEqual([100, 100, 100]);
		expect(upgradeNotice(ctx, tobias)).toEqual({ validFrom: '2026-10-19', step: 0.1 });
		expect(applyWeeklyProgression(ctx)).toEqual([]);
		expect(planSaveCount(ctx, tobias)).toBe(0);
	});

	it('nimmt ohne Bewertung „passend“ und lässt den Plan nach einer schwachen Woche gleich', () => {
		const { ctx, tobias } = setup();
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-12' });
		fulfill(ctx, tobias, '2026-10-12', 5);
		fulfill(ctx, niklas, '2026-10-12', 4);
		ctx.clock.set('2026-10-18T22:30:00Z');
		expect(applyWeeklyProgression(ctx)).toEqual([tobias]);
		expect(targets(ctx, tobias, '2026-10-19')).toEqual([105, 105, 105]);
		expect(targets(ctx, niklas, '2026-10-19')).toEqual([100, 100, 100]);
		expect(upgradeNotice(ctx, niklas)).toBeNull();
	});

	it('baut auf dem Faktor auf und beginnt nach einem selbst gespeicherten Plan neu', () => {
		const { ctx, tobias } = setup();
		fulfill(ctx, tobias, '2026-10-12', 7);
		ctx.clock.set('2026-10-18T22:30:00Z');
		applyWeeklyProgression(ctx);
		fulfill(ctx, tobias, '2026-10-19', 7, 105);
		ctx.clock.set('2026-10-25T23:30:00Z');
		applyWeeklyProgression(ctx);
		expect(storedPlanOn(ctx, tobias, '2026-10-26')).toMatchObject({ auto: true, factor: 1.1025 });
		expect(targets(ctx, tobias, '2026-10-26')).toEqual([110, 110, 110]);

		savePlan(ctx, tobias, [
			{ exerciseId: 'pushups', unit: 'reps', target: 50 },
			{ exerciseId: 'squats', unit: 'reps', target: 100 },
			{ exerciseId: 'situps', unit: 'reps', target: 100 }
		]);
		expect(storedPlanOn(ctx, tobias, '2026-10-27')).toMatchObject({ auto: false, factor: 1 });
	});

	it('greift nicht, wenn für Montag schon ein eigener Plan gespeichert ist, und nicht vor dem 19.10.', () => {
		const { ctx, tobias } = setup();
		fulfill(ctx, tobias, '2026-10-12', 7);
		addSet(ctx, tobias, { date: '2026-10-18', exerciseId: 'pushups', value: 10 });
		savePlan(ctx, tobias, [
			{ exerciseId: 'squats', unit: 'reps', target: 80 },
			{ exerciseId: 'pushups', unit: 'reps', target: 100 },
			{ exerciseId: 'situps', unit: 'reps', target: 100 }
		]);
		ctx.clock.set('2026-10-18T22:30:00Z');
		expect(applyWeeklyProgression(ctx)).toEqual([]);
		expect(targets(ctx, tobias, '2026-10-19')).toEqual([80, 100, 100]);

		const early = setup('2026-10-11T23:00:00Z');
		expect(applyWeeklyProgression(early.ctx)).toEqual([]);
	});

	it('zeigt eine Vorschau für den nächsten Montag', () => {
		const { ctx, tobias } = setup('2026-10-15T12:00:00Z');
		fulfill(ctx, tobias, '2026-10-12', 3);
		expect(progressionOverview(ctx, tobias)).toMatchObject({
			weekStart: '2026-10-12',
			nextMonday: '2026-10-19',
			fulfilledThisWeek: 3,
			preview: { reason: 'step', step: 0.05 },
			capped: false
		});
		ctx.clock.set('2026-10-17T12:00:00Z');
		expect(progressionOverview(ctx, tobias).preview.reason).toBe('step');
		ctx.clock.set('2026-10-18T12:00:00Z');
		expect(progressionOverview(ctx, tobias).preview.reason).toBe('weak_week');
	});
});

describe('Prompt', () => {
	it('enthält den aktuellen Plan, die Bewertung und den Verlauf', () => {
		const { ctx, tobias } = setup('2026-10-20T12:00:00Z');
		fulfill(ctx, tobias, '2026-10-12', 6);
		rateWeek(ctx, tobias, 'too_easy');
		const prompt = planPrompt(ctx, tobias, 'Knie schonen');
		expect(prompt).toContain('- Liegestütze: 100 Wdh.');
		expect(prompt).toContain('Zu leicht');
		expect(prompt).toContain('In den letzten 8 gewerteten Tagen habe ich den Plan an 6 Tagen geschafft.');
		expect(prompt).toContain('Hinweise von mir: Knie schonen');
	});
});
