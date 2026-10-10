import { error, redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { ServiceError } from '#lib/server/errors.ts';
import { hunterProfile } from '#lib/server/overview.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, depends }) => {
	depends('app:data');
	if (!locals.hunter) redirect(303, '/login');
	try {
		const profile = hunterProfile(getApp().ctx, params.id);
		return {
			profile: {
				summary: profile.summary,
				volume: profile.volume,
				plan: profile.plan,
				verdicts: profile.verdicts,
				calendar: profile.timeline.map((day) => ({ date: day.date, status: day.status })),
				missedDays: profile.timeline.filter((day) => day.status === 'missed').length,
				sickDays: profile.timeline.filter((day) => day.status === 'sick').length
			}
		};
	} catch (caught) {
		if (caught instanceof ServiceError && caught.code === 'not_found') error(404, 'Diesen Hunter gibt es nicht.');
		throw caught;
	}
};
