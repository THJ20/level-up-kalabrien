import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('Öffentliche Schnittstelle', () => {
	it('exportiert die Bausteine für Server und Oberfläche', () => {
		for (const name of [
			'buildTimeline',
			'streaks',
			'levelProgress',
			'earnedBadges',
			'tallyVote',
			'eligibleVoters',
			'reconcileMissedDays',
			'timeBonusPoints',
			'repsBonusPoints',
			'localDateOf',
			'daysUntilDeparture',
			'BADGES',
			'badgeProgress',
			'defaultPlanItems',
			'planFor',
			'parsePlanText',
			'matchExercise',
			'EFFORTS'
		]) {
			expect(domain).toHaveProperty(name);
		}
		expect(domain).not.toHaveProperty('timelineOf');
	});
});
