import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { planPrompt } from '#lib/server/progression.ts';
import { PromptBody } from '#lib/server/schemas.ts';

/** Prompt für die eigene KI mit aktuellem Plan, Bewertung, Verlauf und eigenen Hinweisen. */
export const POST = api(async (event, hunter) => {
	const { notes } = await parseJson(event, PromptBody);
	return { prompt: planPrompt(getApp().ctx, hunter.id, notes ?? '') };
});
