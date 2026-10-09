import { getApp } from '#lib/server/app.ts';
import { invalidateSession } from '#lib/server/auth/sessions.ts';
import { api, clearSessionCookie } from '#lib/server/http.ts';

export const POST = api((event) => {
	if (event.locals.sessionToken) invalidateSession(getApp().ctx, event.locals.sessionToken);
	clearSessionCookie(event);
	return { ok: true };
});
