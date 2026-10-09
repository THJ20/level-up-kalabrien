import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { addSet } from '#lib/server/quest.ts';
import { SetBody } from '#lib/server/schemas.ts';

export const POST = api(async (event, hunter) => {
	const input = await parseJson(event, SetBody);
	return { set: addSet(getApp().ctx, hunter.id, input) };
});
