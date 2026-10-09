import { deactivateHunter } from '#lib/server/admin.ts';
import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';

export const POST = api((event, hunter) => {
	deactivateHunter(getApp().ctx, hunter.id, event.params.id ?? '');
	return { ok: true };
});
