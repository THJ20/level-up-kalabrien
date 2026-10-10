import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { badgeOverview } from '#lib/server/badges.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	return { overview: badgeOverview(getApp().ctx, locals.hunter.id) };
};
