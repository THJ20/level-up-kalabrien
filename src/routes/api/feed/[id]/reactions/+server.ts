import { getApp } from '#lib/server/app.ts';
import { toggleReaction } from '#lib/server/feed.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { ReactionBody } from '#lib/server/schemas.ts';

export const POST = api(async (event, hunter) => {
	const { reaction } = await parseJson(event, ReactionBody);
	return toggleReaction(getApp().ctx, hunter.id, event.params.id ?? '', reaction);
});
