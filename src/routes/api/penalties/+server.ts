import { getApp } from '#lib/server/app.ts';
import { api, parseJson, parseQuery } from '#lib/server/http.ts';
import { createPenalty, listPenalties } from '#lib/server/penalties.ts';
import { ArchivedQuery, PenaltyBody } from '#lib/server/schemas.ts';

export const GET = api((event) => {
	const { archived } = parseQuery(event, ArchivedQuery);
	return { penalties: listPenalties(getApp().ctx, { includeArchived: archived === '1' }) };
});

export const POST = api(async (event, hunter) => {
	const input = await parseJson(event, PenaltyBody);
	return { penalty: createPenalty(getApp().ctx, hunter.id, input) };
});
