import { describe, expect, it } from 'vitest';
import { PLAN_IMPORT_PROMPT, matchExercise, normalizeName, parsePlanText } from './plan-import';

describe('parsePlanText', () => {
	it('liest das Format aus dem Prompt, auch im Codeblock mit Text drumherum', () => {
		const answer = [
			'Klar, hier ist dein Plan:',
			'```',
			'Liegestütze | 100 | Wdh',
			'Plank | 3 | Min',
			'Laufen | 2,5 | km',
			'```',
			'Viel Erfolg!'
		].join('\n');
		expect(parsePlanText(answer)).toEqual({
			items: [
				{ name: 'Liegestütze', target: 100, unit: 'reps' },
				{ name: 'Plank', target: 3, unit: 'minutes' },
				{ name: 'Laufen', target: 2.5, unit: 'km' }
			],
			skipped: []
		});
	});

	it('liest Markdown-Tabellen und überspringt Kopf und Trennlinie', () => {
		const table = ['| Übung | Ziel | Einheit |', '|---|---|---|', '| Kniebeugen | 80 | Wdh |', '| Seilspringen | 10 | Min |'].join(
			'\n'
		);
		expect(parsePlanText(table).items).toEqual([
			{ name: 'Kniebeugen', target: 80, unit: 'reps' },
			{ name: 'Seilspringen', target: 10, unit: 'minutes' }
		]);
	});

	it('versteht freie Zeilen mit Sätzen, Sekunden, Metern und Aufzählungszeichen', () => {
		const text = [
			'- 3x20 Kniebeugen',
			'* 4 x 30 Sek Plank',
			'1. 100 Liegestütze',
			'Burpees: 25',
			'5 km Laufen',
			'Rudern 2000 m',
			'Wandsitzen 90 Sekunden'
		].join('\n');
		expect(parsePlanText(text).items).toEqual([
			{ name: 'Kniebeugen', target: 60, unit: 'reps' },
			{ name: 'Plank', target: 2, unit: 'minutes' },
			{ name: 'Liegestütze', target: 100, unit: 'reps' },
			{ name: 'Burpees', target: 25, unit: 'reps' },
			{ name: 'Laufen', target: 5, unit: 'km' },
			{ name: 'Rudern', target: 2, unit: 'km' },
			{ name: 'Wandsitzen', target: 2, unit: 'minutes' }
		]);
	});

	it('liest CSV und JSON', () => {
		expect(parsePlanText('Liegestütze,100,Wdh\nPlank;3;Min').items).toEqual([
			{ name: 'Liegestütze', target: 100, unit: 'reps' },
			{ name: 'Plank', target: 3, unit: 'minutes' }
		]);
		const json = JSON.stringify({ uebungen: [{ name: 'Dips', ziel: 30, einheit: 'Wdh' }, { übung: 'Yoga', target: '15 Min' }] });
		expect(parsePlanText(json).items).toEqual([
			{ name: 'Dips', target: 30, unit: 'reps' },
			{ name: 'Yoga', target: 15, unit: 'minutes' }
		]);
	});

	it('fasst doppelte Übungen zusammen und meldet unverständliche Zeilen', () => {
		const result = parsePlanText('Liegestütze | 50 | Wdh\nliegestütze | 50 | Wdh\nAufwärmen nicht vergessen');
		expect(result.items).toEqual([{ name: 'Liegestütze', target: 100, unit: 'reps' }]);
		expect(result.skipped).toEqual(['Aufwärmen nicht vergessen']);
	});

	it('liefert für leeren Text nichts', () => {
		expect(parsePlanText('   ')).toEqual({ items: [], skipped: [] });
	});

	it('erzeugt aus dem eigenen Prompt-Beispiel genau drei Übungen', () => {
		expect(parsePlanText(PLAN_IMPORT_PROMPT).items.map((item) => item.name)).toEqual(['Liegestütze', 'Plank', 'Laufen']);
	});
});

describe('matchExercise', () => {
	const catalog = [
		{ id: 'pushups', name: 'Liegestütze' },
		{ id: 'squats', name: 'Kniebeugen' },
		{ id: 'situps', name: 'Sit-ups/Crunches' },
		{ id: 'run', name: 'Laufen/Joggen' },
		{ id: 'pull', name: 'Klimmzüge' }
	];

	it('ordnet Schreibweisen, Synonyme und Teilnamen zu', () => {
		expect(matchExercise('Liegestütze', catalog)).toBe('pushups');
		expect(matchExercise('Push-ups', catalog)).toBe('pushups');
		expect(matchExercise('Kniebeuge', catalog)).toBe('squats');
		expect(matchExercise('Air Squats', catalog)).toBe('squats');
		expect(matchExercise('Crunches', catalog)).toBe('situps');
		expect(matchExercise('Sit-ups', catalog)).toBe('situps');
		expect(matchExercise('Joggen', catalog)).toBe('run');
		expect(matchExercise('Pull-ups', catalog)).toBe('pull');
	});

	it('liefert null für unbekannte Übungen', () => {
		expect(matchExercise('Plank', catalog)).toBeNull();
		expect(matchExercise('', catalog)).toBeNull();
	});

	it('vereinfacht Namen zum Vergleichen', () => {
		expect(normalizeName('Sit-ups / Crunches')).toBe('situpscrunches');
		expect(normalizeName('Klimmzüge')).toBe('klimmzuege');
	});
});
