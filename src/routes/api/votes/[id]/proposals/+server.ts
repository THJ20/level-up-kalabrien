import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { PenaltyBody } from '#lib/server/schemas.ts';
import { proposePenalty } from '#lib/server/votes.ts';

export const POST = api(async (event, hunter) => {
	const input = await parseJson(event, PenaltyBody);
	return { penalty: proposePenalty(getApp().ctx, hunter.id, event.params.id ?? '', input) };
});
