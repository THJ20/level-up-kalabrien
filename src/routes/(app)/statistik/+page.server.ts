import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { todayOf } from '#lib/server/context.ts';
import { listActiveHunters, toRef } from '#lib/server/hunters.ts';
import { stats } from '#lib/server/overview.ts';
import { rangeFor } from '#lib/client/stats.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	const today = todayOf(ctx);
	const range = rangeFor('30', today);
	return {
		today,
		hunters: listActiveHunters(ctx).map(toRef),
		initial: { range, series: stats(ctx, { ...range, hunterIds: [locals.hunter.id] }) }
	};
};
