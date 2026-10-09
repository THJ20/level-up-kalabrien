import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { BallotBody } from '#lib/server/schemas.ts';
import { castBallot } from '#lib/server/votes.ts';

export const POST = api(async (event, hunter) => {
	const { penaltyId } = await parseJson(event, BallotBody);
	return { vote: castBallot(getApp().ctx, hunter.id, event.params.id ?? '', penaltyId) };
});
