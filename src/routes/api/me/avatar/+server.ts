import { getApp } from '#lib/server/app.ts';
import { choosePresetAvatar, clearAvatar, MAX_UPLOAD_BYTES, uploadAvatar } from '#lib/server/avatars.ts';
import { invalid } from '#lib/server/errors.ts';
import { api, parseJson } from '#lib/server/http.ts';
import { AvatarPresetBody } from '#lib/server/schemas.ts';

/** Vorgefertigten Avatar wählen. */
export const PUT = api(async (event, hunter) => {
	const { preset } = await parseJson(event, AvatarPresetBody);
	const app = getApp();
	return { hunter: await choosePresetAvatar(app.ctx, app.config.avatarDir, hunter.id, preset) };
});

/** Eigenes Bild hochladen, der Körper ist die Bilddatei selbst. */
export const POST = api(async (event, hunter) => {
	const type = event.request.headers.get('content-type') ?? '';
	if (!type.startsWith('image/')) throw invalid('Bitte ein Bild hochladen (JPG, PNG oder WebP).');
	const length = Number(event.request.headers.get('content-length') ?? 0);
	if (length > MAX_UPLOAD_BYTES) throw invalid('Das Bild ist zu groß (höchstens 6 MB).');
	const bytes = new Uint8Array(await event.request.arrayBuffer());
	const app = getApp();
	return { hunter: await uploadAvatar(app.ctx, app.config.avatarDir, hunter.id, bytes) };
});

export const DELETE = api(async (_event, hunter) => {
	const app = getApp();
	return { hunter: await clearAvatar(app.ctx, app.config.avatarDir, hunter.id) };
});
