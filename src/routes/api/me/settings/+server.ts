import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { getSettings, updateSettings } from '#lib/server/hunters.ts';
import { SettingsPatch } from '#lib/server/schemas.ts';

export const GET = api((_event, hunter) => ({ settings: getSettings(getApp().ctx, hunter.id) }));

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, SettingsPatch);
	return { settings: updateSettings(getApp().ctx, hunter.id, patch) };
});
