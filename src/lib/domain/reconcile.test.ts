import { describe, expect, it } from 'vitest';
import { reconcileMissedDays } from './reconcile';
import { timelineOf } from './test-helpers';

describe('Abgleich verpasster Tage', () => {
	it('legt neue verpasste Tage an', () => {
		const timeline = timelineOf(['fulfilled', 'missed', 'missed', 'open']);
		expect(reconcileMissedDays(timeline, new Set())).toEqual({
			create: ['2026-10-13', '2026-10-14'],
			lift: []
		});
	});

	it('legt bereits aktive verpasste Tage nicht doppelt an', () => {
		const timeline = timelineOf(['missed', 'missed']);
		expect(reconcileMissedDays(timeline, new Set(['2026-10-12']))).toEqual({
			create: ['2026-10-13'],
			lift: []
		});
	});

	it('hebt verpasste Tage nach Nachtrag oder Krankmeldung auf', () => {
		const timeline = timelineOf(['fulfilled', 'sick', 'missed']);
		const active = new Set(['2026-10-12', '2026-10-13', '2026-10-14']);
		expect(reconcileMissedDays(timeline, active)).toEqual({
			create: [],
			lift: [
				{ date: '2026-10-12', reason: 'backfill' },
				{ date: '2026-10-13', reason: 'sick' }
			]
		});
	});

	it('ignoriert offene und nicht gewertete Tage', () => {
		const timeline = timelineOf(['unscored', 'unscored', 'open']);
		expect(reconcileMissedDays(timeline, new Set())).toEqual({ create: [], lift: [] });
	});
});
