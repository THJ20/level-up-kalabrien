import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { api, parseQuery } from '#lib/server/http.ts';
import { listVotes } from '#lib/server/votes.ts';

const Query = z.object({ status: z.enum(['open', 'all']).default('open') });

export const GET = api((event, hunter) => {
	const { status } = parseQuery(event, Query);
	return { votes: listVotes(getApp().ctx, hunter.id, { status }) };
});
