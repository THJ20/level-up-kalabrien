import { getApp } from '#lib/server/app.ts';
import { readUpload } from '#lib/server/avatars.ts';
import { api } from '#lib/server/http.ts';

/** Hochgeladene Profilbilder, nur für angemeldete Hunter. Der Dateiname ändert sich bei jedem Upload. */
export const GET = api(async (event) => {
	const image = await readUpload(getApp().config.avatarDir, event.params.file ?? '');
	return new Response(new Uint8Array(image), {
		headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=31536000, immutable' }
	});
});
