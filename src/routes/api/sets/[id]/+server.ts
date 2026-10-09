import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { deleteSet, updateSet } from '#lib/server/quest.ts';
import { SetPatch } from '#lib/server/schemas.ts';

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, SetPatch);
	return { set: updateSet(getApp().ctx, hunter.id, event.params.id ?? '', patch) };
});

export const DELETE = api((event, hunter) => {
	deleteSet(getApp().ctx, hunter.id, event.params.id ?? '');
	return { ok: true };
});
