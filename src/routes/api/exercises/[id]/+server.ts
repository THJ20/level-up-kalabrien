import { getApp } from '#lib/server/app.ts';
import { archiveExercise, updateExercise } from '#lib/server/bonus.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { ExercisePatch } from '#lib/server/schemas.ts';

export const PATCH = api(async (event, hunter) => {
	const patch = await parseJson(event, ExercisePatch);
	return { exercise: updateExercise(getApp().ctx, hunter.id, event.params.id ?? '', patch) };
});

export const DELETE = api((event, hunter) => ({
	exercise: archiveExercise(getApp().ctx, hunter.id, event.params.id ?? '')
}));
