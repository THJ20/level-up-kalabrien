import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { getSettings } from '#lib/server/hunters.ts';
import { hunterSummary } from '#lib/server/overview.ts';
import { upgradeNotice } from '#lib/server/progression.ts';
import { openVotesAwaiting, recentMissedNotices } from '#lib/server/votes.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	const { ctx } = getApp();
	const summary = hunterSummary(ctx, locals.hunter.id);
	return {
		me: locals.hunter,
		settings: getSettings(ctx, locals.hunter.id),
		openVotes: openVotesAwaiting(ctx, locals.hunter.id).length,
		progress: {
			quests: summary.level.quests,
			level: summary.level.level,
			rank: summary.level.rank,
			badges: summary.badges.map((badge) => badge.badgeId)
		},
		recentMissed: recentMissedNotices(ctx, locals.hunter.id),
		planUpgrade: upgradeNotice(ctx, locals.hunter.id),
		serverNow: ctx.clock.now().getTime()
	};
};
