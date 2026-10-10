import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { getSettings } from '#lib/server/hunters.ts';
import { openVotesAwaiting } from '#lib/server/votes.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	return {
		me: locals.hunter,
		settings: getSettings(ctx, locals.hunter.id),
		openVotes: openVotesAwaiting(ctx, locals.hunter.id).length
	};
};
