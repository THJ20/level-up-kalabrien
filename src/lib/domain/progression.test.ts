import { describe, expect, it } from 'vitest';
import { mondayOf } from './challenge';
import { defaultPlanItems } from './plan';
import { parsePlanText } from './plan-import';
import { coachPrompt } from './plan-coach';
import { estimateMinutes, nextProgression, type ProgressionItem } from './progression';

const base: ProgressionItem[] = defaultPlanItems().map((item) => ({ ...item, baseTarget: item.target }));
const plank: ProgressionItem = {
	exerciseId: 'plank',
	name: 'Plank',
	unit: 'minutes',
	target: 3,
	baseTarget: 3,
	secondsPerRep: null
};

describe('Wochenstart', () => {
	it('findet den Montag jeder Woche', () => {
		expect(mondayOf('2026-10-12')).toBe('2026-10-12');
		expect(mondayOf('2026-10-18')).toBe('2026-10-12');
		expect(mondayOf('2026-10-19')).toBe('2026-10-19');
		expect(mondayOf('2027-01-01')).toBe('2026-12-28');
	});
});

describe('Dauer', () => {
	it('schätzt Wiederholungen, Minuten und Kilometer', () => {
		expect(estimateMinutes(defaultPlanItems())).toBe(15);
		expect(
			estimateMinutes([plank, { ...plank, exerciseId: 'run', unit: 'km', target: 2, secondsPerRep: null }])
		).toBe(15);
	});
});

describe('Steigerung', () => {
	it('steigert nach Bewertung, ohne Bewertung um 5 %', () => {
		const right = nextProgression({ items: base, factor: 1, rating: null, fulfilledLastWeek: 7 });
		expect(right).toMatchObject({ reason: 'step', step: 0.05, factor: 1.05, changed: true });
		expect(right.items.map((item) => item.target)).toEqual([105, 105, 105]);
		const easy = nextProgression({ items: base, factor: 1, rating: 'too_easy', fulfilledLastWeek: 5 });
		expect(easy.items[0].target).toBe(110);
	});

	it('senkt bei „zu schwer“, auch nach einer schwachen Woche, aber nie unter die Hälfte', () => {
		const hard = nextProgression({ items: base, factor: 1, rating: 'too_hard', fulfilledLastWeek: 2 });
		expect(hard).toMatchObject({ reason: 'reduced', step: -0.1, factor: 0.9 });
		expect(hard.items[0].target).toBe(90);
		expect(nextProgression({ items: base, factor: 0.52, rating: 'too_hard', fulfilledLastWeek: 7 }).factor).toBe(0.5);
	});

	it('bleibt nach einer schwachen Woche gleich', () => {
		const weak = nextProgression({ items: base, factor: 1.2, rating: 'too_easy', fulfilledLastWeek: 4 });
		expect(weak).toMatchObject({ reason: 'weak_week', step: 0, factor: 1.2, changed: false });
	});

	it('steigert kleine Ziele über den Faktor, auch wenn eine Woche gerundet gleich bleibt', () => {
		const first = nextProgression({ items: [plank], factor: 1, rating: null, fulfilledLastWeek: 7 });
		expect(first).toMatchObject({ factor: 1.05, changed: false });
		expect(first.items[0].target).toBe(3);
		const later = nextProgression({ items: first.items, factor: 1.16, rating: null, fulfilledLastWeek: 7 });
		expect(later.items[0].target).toBe(4);
	});

	it('pausiert ab etwa 30 Minuten', () => {
		const big = base.map((item) => ({ ...item, baseTarget: 190, target: 190 }));
		expect(estimateMinutes(big)).toBe(28.5);
		expect(nextProgression({ items: big, factor: 1, rating: 'too_easy', fulfilledLastWeek: 7 })).toMatchObject({
			reason: 'capped',
			step: 0,
			changed: false
		});
	});
});

describe('Plan-Prompt', () => {
	const prompt = coachPrompt({
		items: [...defaultPlanItems(), plank],
		rating: 'too_easy',
		notes: '  Knie schonen  ',
		fulfilled: 12,
		scoredDays: 14,
		today: '2026-10-20'
	});

	it('enthält Rahmen, Plan, Bewertung, Verlauf und Hinweise', () => {
		expect(prompt).toContain('in 15 bis 30 Minuten machbar');
		expect(prompt).toContain('ohne Geräte');
		expect(prompt).toContain('- Liegestütze: 100 Wdh.');
		expect(prompt).toContain('- Plank: 3 Min.');
		expect(prompt).toContain(
			'Meine Einschätzung: Zu leicht. Mach ihn deutlich fordernder, über mehr Wiederholungen oder schwerere Varianten, nicht über mehr Übungen.'
		);
		expect(prompt).toContain('Genau 3 bis 5 Übungen. Mein Plan hat gerade 4, bleib möglichst bei 4. Mehr Übungen sind keine Steigerung.');
		expect(prompt).not.toContain('12 Übungen');
		expect(prompt).toContain('an 12 Tagen geschafft');
		expect(prompt).toContain('Hinweise von mir: Knie schonen');
		expect(prompt).toContain('noch 191 Tage');
	});

	it('enthält kein Format-Beispiel, das der Import fälschlich als Plan liest', () => {
		expect(parsePlanText(prompt).items.filter((item) => item.name !== 'Plank' && !/Liegest|Kniebeug|Sit-ups/.test(item.name))).toEqual(
			[]
		);
	});
});
