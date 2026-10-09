import { getApp } from '#lib/server/app.ts';
import { addBonusEntry } from '#lib/server/bonus.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { BonusBody } from '#lib/server/schemas.ts';

export const POST = api(async (event, hunter) => {
	const input = await parseJson(event, BonusBody);
	return { entry: addBonusEntry(getApp().ctx, hunter.id, input) };
});
