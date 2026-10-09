import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { login } from '#lib/server/auth/login.ts';
import { parseJson, publicApi, setSessionCookie } from '#lib/server/http.ts';

const Body = z.object({ name: z.string(), password: z.string() });

export const POST = publicApi(async (event) => {
	const input = await parseJson(event, Body);
	const app = getApp();
	const { hunter, session } = await login(app.ctx, app.throttle, { ...input, ip: event.getClientAddress() });
	setSessionCookie(event, session);
	return { hunter };
});
