import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { archivePenalty, updatePenalty } from '#lib/server/penalties.ts';
import { PenaltyPatch } from '#lib/server/schemas.ts';

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, PenaltyPatch);
	return { penalty: updatePenalty(getApp().ctx, hunter.id, event.params.id ?? '', patch) };
});

export const DELETE = api((event, hunter) => ({
	penalty: archivePenalty(getApp().ctx, hunter.id, event.params.id ?? '')
}));
