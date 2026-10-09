export interface Ballot {
	voterId: string;
	penaltyId: string;
}

export interface VoteResult {
	closed: boolean;
	counts: Record<string, number>;
	missingVoterIds: string[];
	winnerPenaltyId: string | null;
	decidedByLot: boolean;
}

export function randomIndex(count: number): number {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	return buffer[0] % count;
}

export function eligibleVoters(activeHunterIds: readonly string[], offenderId: string): string[] {
	return activeHunterIds.filter((id) => id !== offenderId);
}

/** Zählt eine Abstimmung aus. Sie endet erst, wenn alle Stimmberechtigten abgestimmt haben. */
export function tallyVote(
	eligibleVoterIds: readonly string[],
	ballots: readonly Ballot[],
	pickIndex: (count: number) => number = randomIndex
): VoteResult {
	const eligible = new Set(eligibleVoterIds);
	const latestChoice = new Map<string, string>();
	for (const ballot of ballots) {
		if (eligible.has(ballot.voterId)) latestChoice.set(ballot.voterId, ballot.penaltyId);
	}

	const counts: Record<string, number> = {};
	for (const penaltyId of latestChoice.values()) counts[penaltyId] = (counts[penaltyId] ?? 0) + 1;

	const missingVoterIds = eligibleVoterIds.filter((id) => !latestChoice.has(id));
	const closed = eligibleVoterIds.length > 0 && missingVoterIds.length === 0;
	if (!closed) {
		return { closed, counts, missingVoterIds, winnerPenaltyId: null, decidedByLot: false };
	}

	const topCount = Math.max(...Object.values(counts));
	const leaders = Object.keys(counts)
		.filter((penaltyId) => counts[penaltyId] === topCount)
		.sort();
	const winnerPenaltyId = leaders.length === 1 ? leaders[0] : leaders[pickIndex(leaders.length)];
	return { closed, counts, missingVoterIds, winnerPenaltyId, decidedByLot: leaders.length > 1 };
}
