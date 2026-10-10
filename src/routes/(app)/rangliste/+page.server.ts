import { redirect } from '@sveltejs/kit';
import { addDays, daysBetween, isLocalDate } from '#lib/domain/index.ts';
import { getApp } from '#lib/server/app.ts';
import { todayOf } from '#lib/server/context.ts';
import { leaderboard } from '#lib/server/overview.ts';
import type { PageServerLoad } from './$types';

export type Period = 'woche' | 'monat' | 'gesamt';

export const load: PageServerLoad = ({ locals, url, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	const today = todayOf(ctx);
	const period = (['woche', 'monat', 'gesamt'] as const).find((value) => value === url.searchParams.get('zeitraum')) ?? 'woche';
	const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
	const from =
		period === 'woche' ? addDays(today, -weekday) : period === 'monat' ? addDays(today, -29) : undefined;
	const tab = (['bonus', 'streak'] as const).find((value) => value === url.searchParams.get('wertung')) ?? 'gesamt';
	return {
		board: leaderboard(ctx, { from, to: today }),
		period,
		tab,
		rangeDays: from && isLocalDate(from) ? daysBetween(from, today) + 1 : null
	};
};
