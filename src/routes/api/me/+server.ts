import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { getSettings, updateProfile } from '#lib/server/hunters.ts';
import { hunterSummary } from '#lib/server/overview.ts';
import { ProfilePatch } from '#lib/server/schemas.ts';

export const GET = api((_event, hunter) => {
	const { ctx } = getApp();
	return { summary: hunterSummary(ctx, hunter.id), settings: getSettings(ctx, hunter.id) };
});

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, ProfilePatch);
	return { hunter: updateProfile(getApp().ctx, hunter.id, patch) };
});
