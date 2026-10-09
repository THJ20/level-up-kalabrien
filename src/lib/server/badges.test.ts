import { describe, expect, it } from 'vitest';
import { createTestContext, insertHunter, seedFullDay } from './testing';
import { listHunterBadges, syncBadges } from './badges';
import { listFeed } from './feed';
import { addSet, deleteSet, listSets } from './quest';
import { createPenalty } from './penalties';
import { castBallot, evaluateAllHunters, listVotes } from './votes';

function completeToday(ctx: ReturnType<typeof createTestContext>, hunterId: string) {
	for (const exercise of ['pushups', 'squats', 'situps'] as const) {
		addSet(ctx, hunterId, { date: '2026-10-09', exercise, reps: 100 });
	}
}

describe('Badges', () => {
	it('vergibt Erwacht mit genau einem Feed-Ereignis', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		completeToday(ctx, tobias);
		expect(listHunterBadges(ctx, tobias).map((badge) => badge.badgeId)).toEqual(['awakened']);
		expect(syncBadges(ctx, tobias)).toEqual([]);
		const badgeEvents = listFeed(ctx, tobias).filter((item) => item.type === 'badge');
		expect(badgeEvents.map((item) => item.payload)).toEqual([{ badgeId: 'awakened' }]);
	});

	it('entzieht einen Badge, wenn die Bedingung wegfällt', () => {
		const ctx = createTestContext();
		const tobias = insertHunter(ctx, 'Tobias');
		completeToday(ctx, tobias);
		deleteSet(ctx, tobias, listSets(ctx, tobias, '2026-10-09')[0].id);
		expect(listHunterBadges(ctx, tobias)).toEqual([]);
	});

	it('vergibt Penalty Zone für eine verhängte Strafe', () => {
		const ctx = createTestContext('2026-10-10T10:00:00Z');
		const tobias = insertHunter(ctx, 'Tobias', { registeredOn: '2026-10-09' });
		const niklas = insertHunter(ctx, 'Niklas', { registeredOn: '2026-10-09' });
		seedFullDay(ctx, niklas, '2026-10-09');
		evaluateAllHunters(ctx);
		const penalty = createPenalty(ctx, niklas, { title: '50 Burpees' });
		castBallot(ctx, niklas, listVotes(ctx, niklas, { status: 'open' })[0].id, penalty.id);
		expect(listHunterBadges(ctx, tobias).map((badge) => badge.badgeId)).toContain('penalty-zone');
	});
});
