import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { planOverview, savePlan } from '#lib/server/plans.ts';
import { PlanBody } from '#lib/server/schemas.ts';

export const GET = api((_event, hunter) => ({ plan: planOverview(getApp().ctx, hunter.id) }));

export const PUT = api(async (event, hunter) => {
	const { items } = await parseJson(event, PlanBody);
	return { plan: savePlan(getApp().ctx, hunter.id, items) };
});
