import { describe, expect, it } from 'vitest';
import { describeFeedItem, type FeedItemLike } from './feed-text';

function item(type: string, payload: Record<string, unknown>, hunterId = 'n'): FeedItemLike {
	return {
		type,
		payload,
		createdAt: new Date('2026-10-12T10:00:00Z'),
		hunter: { id: hunterId, name: 'Niklas', color: '#4cc9ff' }
	};
}

describe('Feed-Texte', () => {
	it('beschreibt Aktivität mit Wiederholungen und Bonus', () => {
		const text = describeFeedItem(
			item('activity', {
				date: '2026-10-12',
				quest: [
					{ exerciseId: 'pushups', name: 'Liegestütze', unit: 'reps', value: 40 },
					{ exerciseId: 'plank', name: 'Plank', unit: 'minutes', value: 3 },
					{ exerciseId: 'run', name: 'Laufen/Joggen', unit: 'km', value: 2.5 }
				],
				bonus: [{ exercise: 'Laufen/Joggen', minutes: 30, reps: null, effort: 'hard', distanceKm: 5, points: 210 }]
			}),
			'me'
		);
		expect(text.text).toBe(
			'Niklas hat 40 Liegestütze, Plank (3 Min.), Laufen/Joggen (2,5 km) und Laufen/Joggen (30 Min., +210 BP) eingetragen.'
		);
	});

	it('nennt den Tag bei nachgetragener Aktivität', () => {
		const text = describeFeedItem(
			item('activity', {
				date: '2026-10-10',
				quest: [{ exerciseId: 'pushups', name: 'Liegestütze', unit: 'reps', value: 100 }],
				bonus: []
			}),
			'me'
		);
		expect(text.text).toBe('Niklas hat 100 Liegestütze für Sa, 10.10. eingetragen.');
	});

	it('meldet geänderte Trainingspläne mit Gültigkeit und Übungen', () => {
		const payload = {
			validFrom: '2026-10-13',
			items: [
				{ name: 'Liegestütze', unit: 'reps', target: 80 },
				{ name: 'Plank', unit: 'minutes', target: 3 }
			]
		};
		expect(describeFeedItem(item('plan_changed', payload), 'me')).toEqual({
			text: 'Niklas hat den Trainingsplan geändert, gilt ab Di, 13.10.',
			detail: 'Liegestütze 80 Wdh. · Plank 3 Min.',
			tone: 'accent'
		});
		expect(describeFeedItem(item('plan_changed', { ...payload, validFrom: '2026-10-09' }, 'me'), 'me').text).toBe(
			'Du hast deinen Trainingsplan geändert.'
		);
	});

	it('spricht den Betrachter mit du an', () => {
		expect(describeFeedItem(item('quest_complete', { date: '2026-10-12', backfilled: false }, 'me'), 'me').text).toBe(
			'Du hast die Daily Quest erfüllt.'
		);
		expect(describeFeedItem(item('level_up', { level: 5 }, 'me'), 'me').text).toBe('Du bist auf Level 5 aufgestiegen.');
	});

	it.each([
		['joined', {}, 'Niklas ist der Challenge beigetreten.', 'accent'],
		['quest_complete', { date: '2026-10-10', backfilled: true }, 'Niklas hat die Daily Quest vom Sa, 10.10. nachgetragen.', 'ok'],
		['rank_up', { rank: 'C' }, 'Niklas ist jetzt C-Rang Hunter.', 'gold'],
		['badge', { badgeId: 'awakened' }, 'Niklas hat den Badge „Erwacht“ erhalten.', 'accent'],
		['missed', { date: '2026-10-11', voteId: 'v1' }, 'Niklas hat die Daily Quest am So, 11.10. verpasst.', 'warn'],
		['sick', { date: '2026-10-11', backfilled: false }, 'Niklas hat sich für So, 11.10. krank gemeldet.', 'sick'],
		[
			'missed_lifted',
			{ date: '2026-10-11', reason: 'backfill', verdictLifted: true },
			'Niklas hat den So, 11.10. nachgetragen. Die Strafe ist aufgehoben.',
			'ok'
		],
		[
			'verdict',
			{ date: '2026-10-11', penaltyTitle: '50 Burpees', decidedByLot: true },
			'Urteil für Niklas wegen So, 11.10.: 50 Burpees (per Los).',
			'warn'
		]
	])('%s', (type, payload, expected, tone) => {
		const text = describeFeedItem(item(type, payload), 'me');
		expect(text.text).toBe(expected);
		expect(text.tone).toBe(tone);
	});

	it('ergänzt bei verpassten Tagen den Hinweis auf die Abstimmung', () => {
		expect(describeFeedItem(item('missed', { date: '2026-10-11', voteId: 'v1' }), 'me').detail).toBe(
			'Die Strafabstimmung läuft.'
		);
	});
});
