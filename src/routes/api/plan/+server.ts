import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { planOverview, savePlan } from '#lib/server/plans.ts';
import { progressionOverview } from '#lib/server/progression.ts';
import { rotationOverview } from '#lib/server/rotation.ts';
import { PlanBody } from '#lib/server/schemas.ts';

export const GET = api((_event, hunter) => {
	const { ctx } = getApp();
	return {
		plan: planOverview(ctx, hunter.id),
		progression: progressionOverview(ctx, hunter.id),
		rotation: rotationOverview(ctx, hunter.id)
	};
});

export const PUT = api(async (event, hunter) => {
	const { items } = await parseJson(event, PlanBody);
	return { plan: savePlan(getApp().ctx, hunter.id, items) };
});
