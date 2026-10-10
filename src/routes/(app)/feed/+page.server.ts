import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { listFeed } from '#lib/server/feed.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	return { items: listFeed(getApp().ctx, locals.hunter.id, { limit: 30 }) };
};
