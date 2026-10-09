import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { reportSick, withdrawSick } from '#lib/server/quest.ts';

export const PUT = api((event, hunter) => {
	reportSick(getApp().ctx, hunter.id, event.params.date ?? '');
	return { ok: true };
});

export const DELETE = api((event, hunter) => {
	withdrawSick(getApp().ctx, hunter.id, event.params.date ?? '');
	return { ok: true };
});
