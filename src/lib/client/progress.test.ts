import { describe, expect, it } from 'vitest';
import { progressMessages, warningMessages, type ProgressSnapshot } from './progress';

const base: ProgressSnapshot = { quests: 4, level: 5, rank: 'E', badges: ['awakened'] };

describe('Fortschritts-Meldungen', () => {
	it('meldet nichts ohne vorherigen Stand', () => {
		expect(progressMessages(null, base)).toEqual([]);
	});

	it('meldet erfüllte Quest, Level-up, Rangaufstieg und neue Badges in dieser Reihenfolge', () => {
		const after: ProgressSnapshot = {
			quests: 5,
			level: 10,
			rank: 'D',
			badges: ['awakened', 'rank-d', 'pushups-1']
		};
		const messages = progressMessages(base, after);
		expect(messages.map((message) => message.kind)).toEqual([
			'quest_complete',
			'level_up',
			'rank_up',
			'badge',
			'badge'
		]);
		expect(messages[1]).toMatchObject({ title: 'LEVEL UP!', subtitle: 'LV. 5 → 10' });
		expect(messages[2]).toMatchObject({ title: 'RANK UP', subtitle: 'D-RANK HUNTER' });
		expect(messages[3]).toMatchObject({ title: 'NEW BADGE', subtitle: 'Rang D' });
	});

	it('meldet keinen Rückschritt', () => {
		expect(progressMessages(base, { ...base, quests: 3, level: 4, badges: [] })).toEqual([]);
	});
});

describe('Warnungen', () => {
	it('meldet nur ungesehene verpasste Tage anderer', () => {
		const missed = [
			{ id: 'a', hunterName: 'Niklas', date: '2026-10-11' },
			{ id: 'b', hunterName: 'Ramzy', date: '2026-10-11' }
		];
		const messages = warningMessages(missed, new Set(['a']));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ kind: 'warning', title: 'WARNING', id: 'warning-b' });
		expect(messages[0].body).toContain('Ramzy');
	});
});
