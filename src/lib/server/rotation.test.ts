import { describe, expect, it } from 'vitest';
import { addDays, type LocalDate } from '#lib/domain/index.ts';
import { createTestContext, insertHunter, seedFullDay } from './testing';
import { listExercises } from './bonus';
import { planPrompt } from './coach';
import { applyWeeklyProgression, progressionOverview, rateWeek } from './progression';
import { storedPlanOn } from './records';
import { applyRotation, rotationOverview } from './rotation';

function setup(nowIso = '2026-10-18T12:00:00Z') {
	const ctx = createTestContext(nowIso);
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
	return { ctx, tobias };
}

function fulfill(ctx: ReturnType<typeof setup>['ctx'], hunterId: string, from: LocalDate, days: number) {
	for (let index = 0; index < days; index++) seedFullDay(ctx, hunterId, addDays(from, index));
}

describe('Neue Muskelgruppen', () => {
	it('schlägt beim Startplan Rücken und Ausdauer vor', () => {
		const { ctx, tobias } = setup();
		const overview = rotationOverview(ctx, tobias);
		expect(overview.decision).toBeNull();
		expect(overview.focus.map((entry) => entry.label)).toEqual(['Rücken', 'Ausdauer']);
		expect(overview.swaps.map((swap) => `${swap.replace.name} → ${swap.with.name}`)).toEqual([
			'Liegestütze → Superman',
			'Kniebeugen → Burpees'
		]);
		expect(overview.trained.map((entry) => entry.label)).toContain('Brust und Trizeps');
	});

	it('behält den Plan, wenn man ablehnt, und der Check-in ist danach erledigt', () => {
		const { ctx, tobias } = setup();
		fulfill(ctx, tobias, '2026-10-12', 6);
		rateWeek(ctx, tobias, 'right');
		expect(progressionOverview(ctx, tobias).checkinDue).toBe(true);
		expect(applyRotation(ctx, tobias, []).decision).toBe('declined');
		expect(progressionOverview(ctx, tobias).checkinDue).toBe(false);
		expect(storedPlanOn(ctx, tobias, '2026-10-19')?.items.map((item) => item.name)).toEqual([
			'Liegestütze',
			'Kniebeugen',
			'Sit-ups/Crunches'
		]);
	});

	it('übernimmt gewählte Tausche ab Montag, die übrigen Übungen steigen trotzdem', () => {
		const { ctx, tobias } = setup();
		fulfill(ctx, tobias, '2026-10-12', 6);
		rateWeek(ctx, tobias, 'right');
		expect(applyRotation(ctx, tobias, [0]).decision).toBe('accepted');

		const monday = storedPlanOn(ctx, tobias, '2026-10-19');
		expect(monday?.auto).toBe(false);
		expect(monday?.items.map((item) => [item.name, item.target])).toEqual([
			['Superman', 30],
			['Kniebeugen', 105],
			['Sit-ups/Crunches', 105]
		]);
		expect(storedPlanOn(ctx, tobias, '2026-10-18')?.items[0].name).toBe('Liegestütze');
		expect(listExercises(ctx).some((exercise) => exercise.name === 'Superman')).toBe(true);

		ctx.clock.set('2026-10-18T22:30:00Z');
		expect(applyWeeklyProgression(ctx)).toEqual([]);
	});

	it('nutzt vorhandene Katalogübungen und prüft die Auswahl', () => {
		const { ctx, tobias } = setup('2026-10-15T12:00:00Z');
		seedFullDay(ctx, tobias, '2026-10-12');
		const before = listExercises(ctx).length;
		applyRotation(ctx, tobias, [1]);
		const plan = storedPlanOn(ctx, tobias, '2026-10-16');
		expect(plan?.items.map((item) => item.name)).toEqual(['Liegestütze', 'Burpees', 'Sit-ups/Crunches']);
		expect(plan?.items.map((item) => item.target)).toEqual([100, 25, 100]);
		expect(listExercises(ctx)).toHaveLength(before);
		expect(() => applyRotation(ctx, tobias, [7])).toThrow(expect.objectContaining({ code: 'invalid_input' }));
	});

	it('baut die neuen Muskelgruppen in den KI-Prompt ein', () => {
		const { ctx, tobias } = setup();
		const prompt = planPrompt(ctx, tobias, '', true);
		expect(prompt).toContain('Fokus diese Woche: Bring neue Muskelgruppen rein, vor allem Rücken und Ausdauer.');
		expect(prompt).toContain('Tausche dafür 1 bis 2 Übungen, der Rest bleibt.');
		expect(planPrompt(ctx, tobias, '')).not.toContain('Fokus diese Woche');
	});
});
