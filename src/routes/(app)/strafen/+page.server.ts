import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { listActiveHunters } from '#lib/server/hunters.ts';
import { listPenalties } from '#lib/server/penalties.ts';
import { listVerdicts, listVotes } from '#lib/server/votes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	const votes = listVotes(ctx, locals.hunter.id, { status: 'all' });
	return {
		openVotes: votes.filter((vote) => vote.status === 'open'),
		pastVotes: votes.filter((vote) => vote.status !== 'open').slice(0, 15),
		penalties: listPenalties(ctx),
		verdicts: listVerdicts(ctx),
		hunters: listActiveHunters(ctx).map(({ id, name, color }) => ({ id, name, color }))
	};
};
