import { getApp } from '#lib/server/app.ts';
import { deleteBonusEntry, updateBonusEntry } from '#lib/server/bonus.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { BonusPatch } from '#lib/server/schemas.ts';

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, BonusPatch);
	return { entry: updateBonusEntry(getApp().ctx, hunter.id, event.params.id ?? '', patch) };
});

export const DELETE = api((event, hunter) => {
	deleteBonusEntry(getApp().ctx, hunter.id, event.params.id ?? '');
	return { ok: true };
});
