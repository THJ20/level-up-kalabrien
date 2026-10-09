import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { api, parseQuery } from '#lib/server/http.ts';
import { stats } from '#lib/server/overview.ts';
import { LocalDateSchema } from '#lib/server/schemas.ts';

const Query = z.object({
	from: LocalDateSchema,
	to: LocalDateSchema,
	hunters: z.string().optional()
});

export const GET = api((event) => {
	const { from, to, hunters } = parseQuery(event, Query);
	const hunterIds = hunters ? hunters.split(',').filter(Boolean) : undefined;
	return { series: stats(getApp().ctx, { from, to, hunterIds }) };
});
