import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { listFeed } from '#lib/server/feed.ts';
import { api, parseQuery } from '#lib/server/http.ts';

const Query = z.object({
	before: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().min(1).max(100).optional()
});

export const GET = api((event, hunter) => {
	const query = parseQuery(event, Query);
	return { items: listFeed(getApp().ctx, hunter.id, query) };
});
