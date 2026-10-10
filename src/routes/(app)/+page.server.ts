import { redirect } from '@sveltejs/kit';
import { isTrackedDay } from '#lib/domain/index.ts';
import { getApp } from '#lib/server/app.ts';
import { listExercises } from '#lib/server/bonus.ts';
import { listFeed } from '#lib/server/feed.ts';
import { dayDetail, hunterSummary, todayBoard } from '#lib/server/overview.ts';
import { hunterTimeline } from '#lib/server/records.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	const me = locals.hunter;
	const summary = hunterSummary(ctx, me.id);

	const requested = url.searchParams.get('date');
	const date = requested && isTrackedDay(requested) && requested <= summary.today ? requested : summary.today;

	return {
		summary,
		date,
		isToday: date === summary.today,
		detail: isTrackedDay(date) ? dayDetail(ctx, me.id, date) : null,
		calendar: hunterTimeline(ctx, me.id).map((day) => ({ date: day.date, status: day.status })),
		board: todayBoard(ctx),
		exercises: listExercises(ctx),
		feed: listFeed(ctx, me.id, { limit: 6 })
	};
};
