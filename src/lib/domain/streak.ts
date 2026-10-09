import type { DaySummary } from './timeline';

export interface StreakInfo {
	current: number;
	longest: number;
}

/** Verpasste Tage beenden den Streak, alle anderen nicht erfüllten Tage pausieren ihn. */
export function streaks(timeline: readonly DaySummary[]): StreakInfo {
	let current = 0;
	let longest = 0;
	for (const day of timeline) {
		if (day.status === 'fulfilled') {
			current += 1;
			longest = Math.max(longest, current);
		} else if (day.status === 'missed') {
			current = 0;
		}
	}
	return { current, longest };
}
