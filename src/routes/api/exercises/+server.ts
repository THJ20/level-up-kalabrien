import { getApp } from '#lib/server/app.ts';
import { createExercise, listExercises } from '#lib/server/bonus.ts';
import { api, parseJson, parseQuery } from '#lib/server/http.ts';
import { ArchivedQuery, ExerciseBody } from '#lib/server/schemas.ts';

export const GET = api((event) => {
	const { archived } = parseQuery(event, ArchivedQuery);
	return { exercises: listExercises(getApp().ctx, { includeArchived: archived === '1' }) };
});

export const POST = api(async (event, hunter) => {
	const input = await parseJson(event, ExerciseBody);
	return { exercise: createExercise(getApp().ctx, hunter.id, input) };
});
