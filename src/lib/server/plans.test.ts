import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter } from './testing';
import { listExercises } from './bonus';
import { listFeed } from './feed';
import { planOverview, savePlan } from './plans';
import { addSet } from './quest';
import { hunterTimeline, loadPlanVersions, planSaveCount } from './records';
import { listHunterBadges } from './badges';

function setup(nowIso = '2026-10-14T10:00:00Z') {
	const ctx = createTestContext(nowIso);
	const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-12' });
	const byName = (name: string) => listExercises(ctx).find((exercise) => exercise.name === name)!;
	return { ctx, tobias, byName };
}

describe('Trainingsplan', () => {
	it('startet mit 3 x 100 und gilt jeden Tag gleich', () => {
		const { ctx, tobias } = setup();
		const overview = planOverview(ctx, tobias);
		expect(overview.current.map((item) => [item.name, item.target, item.unit])).toEqual([
			['Liegestütze', 100, 'reps'],
			['Kniebeugen', 100, 'reps'],
			['Sit-ups/Crunches', 100, 'reps']
		]);
		expect(overview.upcoming).toBeNull();
		expect(overview.nextStart).toBe('2026-10-09');
		expect(planSaveCount(ctx, tobias)).toBe(0);
	});

	it('ersetzt den Startplan rückwirkend, solange noch nichts eingetragen ist', () => {
		const { ctx, tobias, byName } = setup();
		savePlan(ctx, tobias, [
			{ exerciseId: 'pushups', unit: 'reps', target: 50 },
			{ exerciseId: byName('Seilspringen').id, unit: 'minutes', target: 10 }
		]);
		const versions = loadPlanVersions(ctx, tobias);
		expect(versions).toHaveLength(1);
		expect(versions[0].validFrom).toBe('2026-10-09');
		expect(hunterTimeline(ctx, tobias)[3].plan.map((item) => item.name)).toEqual(['Liegestütze', 'Seilspringen']);
		expect(planSaveCount(ctx, tobias)).toBe(1);
		expect(listHunterBadges(ctx, tobias).map((badge) => badge.badgeId)).toContain('architect');
	});

	it('gilt nach dem ersten Eintrag erst ab morgen und überschreibt den Plan für morgen', () => {
		const { ctx, tobias, byName } = setup();
		addSet(ctx, tobias, { date: '2026-10-14', exerciseId: 'pushups', value: 10 });
		expect(planOverview(ctx, tobias).nextStart).toBe('2026-10-15');

		savePlan(ctx, tobias, [{ exerciseId: 'pushups', unit: 'reps', target: 120 }]);
		ctx.clock.advance(1000);
		const plank = byName('Burpees');
		const overview = savePlan(ctx, tobias, [{ exerciseId: plank.id, unit: 'reps', target: 40 }]);
		expect(overview.current.map((item) => item.exerciseId)).toEqual(['pushups', 'squats', 'situps']);
		expect(overview.upcoming).toMatchObject({ validFrom: '2026-10-15', items: [{ name: 'Burpees', target: 40 }] });
		expect(loadPlanVersions(ctx, tobias).map((version) => version.validFrom)).toEqual(['2026-10-09', '2026-10-15']);

		const changed = listFeed(ctx, tobias).filter((item) => item.type === 'plan_changed');
		expect(changed).toHaveLength(2);
		expect(changed[0].payload).toEqual({
			validFrom: '2026-10-15',
			items: [{ name: 'Burpees', unit: 'reps', target: 40 }]
		});
	});

	it('legt neue Übungen im selben Schritt an', () => {
		const { ctx, tobias } = setup();
		savePlan(ctx, tobias, [
			{ newExercise: { name: 'Plank', kind: 'time' }, unit: 'minutes', target: 3 },
			{ newExercise: { name: 'Hampelmänner', kind: 'reps', secondsPerRep: 2 }, unit: 'reps', target: 50 }
		]);
		expect(planOverview(ctx, tobias).current.map((item) => [item.name, item.unit, item.secondsPerRep])).toEqual([
			['Plank', 'minutes', null],
			['Hampelmänner', 'reps', 2]
		]);
		expect(listExercises(ctx).some((exercise) => exercise.name === 'Plank')).toBe(true);
	});

	it('prüft Einheit, Ziel, Anzahl und doppelte Übungen', () => {
		const { ctx, tobias, byName } = setup();
		const invalid = expect.objectContaining({ code: 'invalid_input' });
		expect(() => savePlan(ctx, tobias, [])).toThrow(invalid);
		expect(() => savePlan(ctx, tobias, [{ exerciseId: 'pushups', unit: 'minutes', target: 5 }])).toThrow(invalid);
		expect(() => savePlan(ctx, tobias, [{ exerciseId: byName('Radfahren').id, unit: 'reps', target: 5 }])).toThrow(invalid);
		expect(() => savePlan(ctx, tobias, [{ exerciseId: 'pushups', unit: 'reps', target: 0 }])).toThrow(invalid);
		expect(() =>
			savePlan(ctx, tobias, [
				{ exerciseId: 'pushups', unit: 'reps', target: 10 },
				{ exerciseId: 'pushups', unit: 'reps', target: 20 }
			])
		).toThrow(invalid);
		expect(() => savePlan(ctx, tobias, [{ unit: 'reps', target: 10 }])).toThrow(invalid);
		expect(() => savePlan(ctx, tobias, [{ exerciseId: 'unbekannt', unit: 'reps', target: 10 }])).toThrow(
			expect.objectContaining({ code: 'not_found' })
		);
		expect(planSaveCount(ctx, tobias)).toBe(0);
	});

	it('lässt sich nach dem letzten Tag nicht mehr ändern', () => {
		const { ctx, tobias } = setup('2027-04-28T10:00:00Z');
		addSet(ctx, tobias, { date: '2027-04-28', exerciseId: 'pushups', value: 10 });
		expect(() => savePlan(ctx, tobias, [{ exerciseId: 'pushups', unit: 'reps', target: 10 }])).toThrow(/vorbei/);
	});
});
