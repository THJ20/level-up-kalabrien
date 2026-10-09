import { and, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { challengeDayNumber, endOfDay, minutesOfDay } from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { hunters } from './db/schema';
import { hunterTimeline } from './records';
import { pendingVoteReminders } from './votes';

function toMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
}

/** Erinnert Hunter mit offener Daily Quest zur eingestellten Uhrzeit, höchstens einmal pro Tag. */
export function sendEveningReminders(ctx: ServiceContext): string[] {
	const now = ctx.clock.now();
	const today = todayOf(ctx);
	if (challengeDayNumber(today) === null) return [];

	const nowMinutes = minutesOfDay(now);
	const due = ctx.db
		.select({ id: hunters.id, reminderTime: hunters.reminderTime })
		.from(hunters)
		.where(
			and(
				eq(hunters.active, true),
				eq(hunters.pushEnabled, true),
				eq(hunters.reminderEnabled, true),
				or(isNull(hunters.lastReminderOn), ne(hunters.lastReminderOn, today))
			)
		)
		.all()
		.filter((hunter) => toMinutes(hunter.reminderTime) <= nowMinutes);
	if (due.length === 0) return [];

	ctx.db
		.update(hunters)
		.set({ lastReminderOn: today })
		.where(
			inArray(
				hunters.id,
				due.map((hunter) => hunter.id)
			)
		)
		.run();

	const open = due
		.filter((hunter) => hunterTimeline(ctx, hunter.id, today).at(-1)?.status === 'open')
		.map((hunter) => hunter.id);
	if (open.length > 0) {
		const hoursLeft = Math.max(1, Math.floor((endOfDay(today).getTime() - now.getTime()) / 3_600_000));
		ctx.notifier.notify(
			open,
			{
				title: 'Daily Quest offen',
				body: `Deine Daily Quest ist noch nicht erfüllt. Noch ${hoursLeft} Std. bis Mitternacht.`,
				url: '/',
				tag: `reminder-${today}`
			},
			'reminder'
		);
	}
	return open;
}

/** Erinnert Stimmberechtigte an Abstimmungen, in denen sie noch nicht abgestimmt haben. */
export function sendVoteReminders(ctx: ServiceContext): string[] {
	const pending = pendingVoteReminders(ctx);
	for (const { hunterId, voteIds } of pending) {
		ctx.notifier.notify(
			[hunterId],
			{
				title: 'Abstimmung offen',
				body:
					voteIds.length === 1
						? 'Eine Strafabstimmung wartet auf deine Stimme.'
						: `${voteIds.length} Strafabstimmungen warten auf deine Stimme.`,
				url: '/strafen',
				tag: 'vote-reminder'
			},
			'vote'
		);
	}
	return pending.map((entry) => entry.hunterId);
}
