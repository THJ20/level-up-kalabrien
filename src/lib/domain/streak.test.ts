import { describe, expect, it } from 'vitest';
import { streaks } from './streak';
import { repeat, timelineOf } from './test-helpers';

describe('Streak', () => {
	it('ist ohne Tage null', () => {
		expect(streaks([])).toEqual({ current: 0, longest: 0 });
	});

	it('zählt erfüllte Tage am Stück', () => {
		expect(streaks(timelineOf(repeat('fulfilled', 3)))).toEqual({ current: 3, longest: 3 });
	});

	it('endet mit einem verpassten Tag', () => {
		expect(streaks(timelineOf(['fulfilled', 'fulfilled', 'missed', 'fulfilled']))).toEqual({
			current: 1,
			longest: 2
		});
	});

	it('pausiert an Kranktagen und nicht gewerteten Tagen', () => {
		expect(streaks(timelineOf(['fulfilled', 'sick', 'fulfilled']))).toEqual({ current: 2, longest: 2 });
		expect(streaks(timelineOf(['unscored', 'fulfilled', 'unscored', 'fulfilled']))).toEqual({
			current: 2,
			longest: 2
		});
	});

	it('bricht nicht, solange heute noch offen ist', () => {
		expect(streaks(timelineOf(['fulfilled', 'fulfilled', 'open']))).toEqual({ current: 2, longest: 2 });
	});
});
