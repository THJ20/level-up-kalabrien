import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter } from './testing';
import {
	addBonusEntry,
	archiveExercise,
	createExercise,
	deleteBonusEntry,
	listBonusEntries,
	listExercises,
	updateBonusEntry,
	updateExercise
} from './bonus';
import { listFeed } from './feed';
import { hunterTimeline } from './records';

function setup() {
	const ctx = createTestContext();
	const tobias = insertHunter(ctx, 'Tobias', { role: 'admin' });
	const niklas = insertHunter(ctx, 'Niklas');
	const byName = (name: string) => {
		const exercise = listExercises(ctx).find((item) => item.name === name);
		if (!exercise) throw new Error(`Übung ${name} fehlt`);
		return exercise;
	};
	return { ctx, tobias, niklas, byName };
}

const invalidInput = expect.objectContaining({ code: 'invalid_input' });

describe('Bonus-Einträge', () => {
	it('berechnen BP nach Minuten oder Wiederholungen mal Stufe', () => {
		const { ctx, tobias, byName } = setup();
		const run = addBonusEntry(ctx, tobias, {
			exerciseId: byName('Laufen/Joggen').id,
			date: '2026-10-12',
			minutes: 30,
			effort: 'moderate',
			distanceKm: 5.2
		});
		expect(run).toMatchObject({ bonusPoints: 150, distanceKm: 5.2, exercise: { name: 'Laufen/Joggen' } });
		const pullups = addBonusEntry(ctx, tobias, {
			exerciseId: byName('Klimmzüge').id,
			date: '2026-10-12',
			reps: 20,
			effort: 'max'
		});
		expect(pullups.bonusPoints).toBe(12);
		expect(hunterTimeline(ctx, tobias).find((day) => day.date === '2026-10-12')?.bonusPoints).toBe(162);
		expect(listFeed(ctx, tobias)[0].payload).toMatchObject({
			bonus: [
				{ exercise: 'Laufen/Joggen', points: 150 },
				{ exercise: 'Klimmzüge', points: 12 }
			]
		});
	});

	it('prüfen Eingaben gegen die Übung', () => {
		const { ctx, tobias, niklas, byName } = setup();
		const date = '2026-10-12';
		expect(() =>
			addBonusEntry(ctx, tobias, { exerciseId: byName('Radfahren').id, date, effort: 'hard' })
		).toThrow(invalidInput);
		expect(() =>
			addBonusEntry(ctx, tobias, { exerciseId: byName('Dips').id, date, minutes: 10, effort: 'hard' })
		).toThrow(invalidInput);
		expect(() =>
			addBonusEntry(ctx, tobias, {
				exerciseId: byName('Yoga/Mobility').id,
				date,
				minutes: 20,
				effort: 'easy',
				distanceKm: 3
			})
		).toThrow(invalidInput);
		const custom = createExercise(ctx, niklas, { name: 'Tischtennis', kind: 'time' });
		archiveExercise(ctx, niklas, custom.id);
		expect(() =>
			addBonusEntry(ctx, tobias, { exerciseId: custom.id, date, minutes: 20, effort: 'easy' })
		).toThrow(invalidInput);
	});

	it('behalten ihre BP, wenn der Katalog sich ändert', () => {
		const { ctx, tobias, niklas } = setup();
		const sprints = createExercise(ctx, niklas, { name: 'Sprints', kind: 'reps', secondsPerRep: 10 });
		const entry = addBonusEntry(ctx, tobias, {
			exerciseId: sprints.id,
			date: '2026-10-12',
			reps: 6,
			effort: 'hard'
		});
		expect(entry.bonusPoints).toBe(7);
		updateExercise(ctx, niklas, sprints.id, { secondsPerRep: 5 });
		expect(listBonusEntries(ctx, tobias, '2026-10-12')[0].bonusPoints).toBe(7);
	});

	it('gehören ihrem Hunter und sind idempotent', () => {
		const { ctx, tobias, niklas, byName } = setup();
		const input = {
			exerciseId: byName('Burpees').id,
			date: '2026-10-12',
			reps: 30,
			effort: 'hard' as const,
			clientId: 'b-1'
		};
		const entry = addBonusEntry(ctx, tobias, input);
		expect(addBonusEntry(ctx, tobias, input).id).toBe(entry.id);
		expect(() => updateBonusEntry(ctx, niklas, entry.id, { reps: 10 })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(updateBonusEntry(ctx, tobias, entry.id, { reps: 15, effort: 'max' }).bonusPoints).toBe(9);
		deleteBonusEntry(ctx, tobias, entry.id);
		expect(listBonusEntries(ctx, tobias, '2026-10-12')).toEqual([]);
	});
});

describe('Bonus-Katalog', () => {
	it('lässt Übungen anlegen, ändern und archivieren', () => {
		const { ctx, tobias, niklas, byName } = setup();
		const created = createExercise(ctx, niklas, {
			name: 'Inlineskaten',
			kind: 'time',
			tracksDistance: true
		});
		expect(created).toMatchObject({ createdBy: niklas, archived: false, secondsPerRep: null });
		expect(() => createExercise(ctx, tobias, { name: 'inlineskaten', kind: 'time' })).toThrow(
			expect.objectContaining({ code: 'conflict' })
		);
		expect(() => createExercise(ctx, tobias, { name: 'Muscle-ups', kind: 'reps' })).toThrow(invalidInput);
		expect(() => updateExercise(ctx, tobias, created.id, { name: 'Skaten' })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(() => updateExercise(ctx, niklas, byName('Dips').id, { secondsPerRep: 4 })).toThrow(
			expect.objectContaining({ code: 'forbidden' })
		);
		expect(updateExercise(ctx, tobias, byName('Dips').id, { secondsPerRep: 4 }).secondsPerRep).toBe(4);
		archiveExercise(ctx, niklas, created.id);
		expect(listExercises(ctx).map((item) => item.name)).not.toContain('Inlineskaten');
		expect(listExercises(ctx, { includeArchived: true }).map((item) => item.name)).toContain('Inlineskaten');
	});
});
