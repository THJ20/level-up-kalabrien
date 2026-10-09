import { describe, expect, it } from 'vitest';
import { eligibleVoters, randomIndex, tallyVote } from './votes';

describe('Stimmberechtigte', () => {
	it('sind alle aktiven Hunter außer dem Betroffenen', () => {
		expect(eligibleVoters(['tobias', 'niklas', 'ramzy'], 'niklas')).toEqual(['tobias', 'ramzy']);
	});
});

describe('Auszählung', () => {
	const voters = ['a', 'b', 'c'];

	it('bleibt offen, solange jemand nicht abgestimmt hat', () => {
		const result = tallyVote(voters, [
			{ voterId: 'a', penaltyId: 'p1' },
			{ voterId: 'b', penaltyId: 'p1' }
		]);
		expect(result.closed).toBe(false);
		expect(result.missingVoterIds).toEqual(['c']);
		expect(result.winnerPenaltyId).toBeNull();
		expect(result.counts).toEqual({ p1: 2 });
	});

	it('endet, wenn alle abgestimmt haben, und die Mehrheit gewinnt', () => {
		const result = tallyVote(voters, [
			{ voterId: 'a', penaltyId: 'p1' },
			{ voterId: 'b', penaltyId: 'p2' },
			{ voterId: 'c', penaltyId: 'p2' }
		]);
		expect(result).toMatchObject({ closed: true, winnerPenaltyId: 'p2', decidedByLot: false });
	});

	it('entscheidet einen Gleichstand per Los', () => {
		const result = tallyVote(
			['a', 'b'],
			[
				{ voterId: 'a', penaltyId: 'p2' },
				{ voterId: 'b', penaltyId: 'p1' }
			],
			() => 1
		);
		expect(result).toMatchObject({ closed: true, winnerPenaltyId: 'p2', decidedByLot: true });
	});

	it('zählt die letzte Stimme eines Hunters', () => {
		const result = tallyVote(
			['a'],
			[
				{ voterId: 'a', penaltyId: 'p1' },
				{ voterId: 'a', penaltyId: 'p3' }
			]
		);
		expect(result.winnerPenaltyId).toBe('p3');
		expect(result.counts).toEqual({ p3: 1 });
	});

	it('ignoriert Stimmen von Nicht-Stimmberechtigten', () => {
		const result = tallyVote(['a'], [
			{ voterId: 'offender', penaltyId: 'p1' },
			{ voterId: 'a', penaltyId: 'p2' }
		]);
		expect(result.winnerPenaltyId).toBe('p2');
		expect(result.counts).toEqual({ p2: 1 });
	});

	it('endet nie ohne Stimmberechtigte', () => {
		expect(tallyVote([], []).closed).toBe(false);
	});

	it('liefert Zufallsindizes im gültigen Bereich', () => {
		for (let i = 0; i < 50; i += 1) {
			const index = randomIndex(3);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(3);
		}
	});
});
