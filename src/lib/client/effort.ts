import { EFFORT_FACTOR, type Effort } from '#lib/domain/index.ts';

export const EFFORT_INFO: Record<Effort, { label: string; endurance: string; strength: string }> = {
	easy: {
		label: 'locker',
		endurance: 'Unterhalten geht problemlos',
		strength: 'Viele Wiederholungen übrig'
	},
	moderate: {
		label: 'moderat',
		endurance: 'Reden in ganzen Sätzen geht noch',
		strength: 'Etwa 4 bis 5 Wiederholungen im Tank'
	},
	hard: {
		label: 'hart',
		endurance: 'Nur noch kurze Sätze',
		strength: 'Etwa 2 bis 3 Wiederholungen im Tank'
	},
	max: {
		label: 'am Limit',
		endurance: 'Reden kaum möglich',
		strength: 'Satz bis zum Muskelversagen'
	}
};

export function effortLabel(effort: Effort): string {
	return `${EFFORT_INFO[effort].label} ×${EFFORT_FACTOR[effort]}`;
}
