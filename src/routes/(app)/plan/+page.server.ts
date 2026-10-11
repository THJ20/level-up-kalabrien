import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { listExercises } from '#lib/server/bonus.ts';
import { planOverview } from '#lib/server/plans.ts';
import { progressionOverview } from '#lib/server/progression.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	return {
		plan: planOverview(ctx, locals.hunter.id),
		progression: progressionOverview(ctx, locals.hunter.id),
		exercises: listExercises(ctx)
	};
};
