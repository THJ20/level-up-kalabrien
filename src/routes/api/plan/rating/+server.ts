import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { rateWeek } from '#lib/server/progression.ts';
import { RatingBody } from '#lib/server/schemas.ts';

/** Bewertung der laufenden Woche, nur für den Hunter selbst sichtbar. */
export const PUT = api(async (event, hunter) => {
	const { rating } = await parseJson(event, RatingBody);
	return { progression: rateWeek(getApp().ctx, hunter.id, rating) };
});
