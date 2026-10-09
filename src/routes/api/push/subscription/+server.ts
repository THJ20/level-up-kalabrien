import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { removePushSubscription, savePushSubscription } from '#lib/server/push.ts';
import { PushSubscriptionBody } from '#lib/server/schemas.ts';

export const POST = api(async (event, hunter) => {
	const subscription = await parseJson(event, PushSubscriptionBody);
	savePushSubscription(getApp().ctx, hunter.id, subscription);
	return { ok: true };
});

export const DELETE = api(async (event, hunter) => {
	const { endpoint } = await parseJson(event, z.object({ endpoint: z.string() }));
	removePushSubscription(getApp().ctx, hunter.id, endpoint);
	return { ok: true };
});
