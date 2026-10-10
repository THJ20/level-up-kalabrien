import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { listActiveHunters, toRef } from '#lib/server/hunters.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const isAdmin = locals.hunter.role === 'admin';
	return {
		isAdmin,
		hunters: isAdmin ? listActiveHunters(getApp().ctx).map(toRef) : []
	};
};
