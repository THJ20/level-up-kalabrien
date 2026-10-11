import { getApp } from '#lib/server/app.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { applyRotation } from '#lib/server/rotation.ts';
import { RotationBody } from '#lib/server/schemas.ts';

/** Übernimmt die gewählten Tauschvorschläge, ohne Auswahl wird abgelehnt und der Plan bleibt. */
export const POST = api(async (event, hunter) => {
	const { accept } = await parseJson(event, RotationBody);
	return { rotation: applyRotation(getApp().ctx, hunter.id, accept) };
});
