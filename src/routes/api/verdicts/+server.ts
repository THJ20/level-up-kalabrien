import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { api, parseQuery } from '#lib/server/http.ts';
import { listVerdicts } from '#lib/server/votes.ts';

const Query = z.object({ hunter: z.string().optional() });

export const GET = api((event) => {
	const { hunter } = parseQuery(event, Query);
	return { verdicts: listVerdicts(getApp().ctx, { hunterId: hunter }) };
});
