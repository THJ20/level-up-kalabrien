import { z } from 'zod';
import { getApp } from '#lib/server/app.ts';
import { inspectInvite } from '#lib/server/auth/invites.ts';
import { parseQuery, publicApi } from '#lib/server/http.ts';

const Query = z.object({ token: z.string().default('') });

export const GET = publicApi((event) => {
	const { token } = parseQuery(event, Query);
	return inspectInvite(getApp().ctx, token);
});
