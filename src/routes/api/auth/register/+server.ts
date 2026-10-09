import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { redeemInvite } from '#lib/server/auth/invites.ts';
import { parseJson, publicApi, setSessionCookie } from '#lib/server/http.ts';

const Body = z.object({
	token: z.string().min(1),
	name: z.string(),
	password: z.string(),
	color: z.string()
});

export const POST = publicApi(async (event) => {
	const { token, ...registration } = await parseJson(event, Body);
	const { hunter, session } = await redeemInvite(getApp().ctx, token, registration);
	setSessionCookie(event, session);
	return { hunter };
});
