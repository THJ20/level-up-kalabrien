import { Cron } from 'croner';
import { TIME_ZONE } from '#lib/domain/index.ts';
import { dailySnapshot } from './backup';
import type { ServiceContext } from './context';
import { applyWeeklyProgression } from './progression';
import { sendEveningReminders, sendVoteReminders } from './reminders';
import { evaluateAllHunters } from './votes';

export const SCHEDULE = {
	evaluate: '0 0 * * *',
	eveningReminders: '* * * * *',
	voteReminders: '0 18 * * *',
	snapshot: '0 3 * * *'
} as const;

/** Startet die zeitgesteuerten Jobs in deutscher Zeit und liefert eine Stopp-Funktion. */
export function startScheduler(
	ctx: ServiceContext,
	options: { backupDir: string; log: (line: string) => void }
): () => void {
	const guarded = (name: string, task: () => unknown) => () => {
		try {
			task();
		} catch (error) {
			options.log(`Job ${name} fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
		}
	};
	const jobOptions = { timezone: TIME_ZONE, protect: true };
	const jobs = [
		new Cron(
			SCHEDULE.evaluate,
			jobOptions,
			guarded('Auswertung', () => {
				evaluateAllHunters(ctx);
				applyWeeklyProgression(ctx);
			})
		),
		new Cron(SCHEDULE.eveningReminders, jobOptions, guarded('Abenderinnerung', () => sendEveningReminders(ctx))),
		new Cron(SCHEDULE.voteReminders, jobOptions, guarded('Abstimmungs-Erinnerung', () => sendVoteReminders(ctx))),
		new Cron(SCHEDULE.snapshot, jobOptions, guarded('Snapshot', () => dailySnapshot(ctx, options.backupDir)))
	];
	return () => {
		for (const job of jobs) job.stop();
	};
}
