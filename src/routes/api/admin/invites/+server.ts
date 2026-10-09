import { z } from 'zod';
import { assertAdmin } from '#lib/server/admin.ts';
import { getApp } from '#lib/server/app.ts';
import { createInvite } from '#lib/server/auth/invites.ts';
import { api, parseJson } from '#lib/server/http.ts';

const Body = z.object({ role: z.enum(['admin', 'hunter']).default('hunter') });

export const POST = api(async (event, hunter) => {
	const { role } = await parseJson(event, Body);
	const app = getApp();
	assertAdmin(app.ctx, hunter.id);
	const invite = createInvite(app.ctx, hunter.id, role);
	const origin = app.config.origin ?? event.url.origin;
	return { link: `${origin}/register?token=${invite.token}`, expiresAt: invite.expiresAt };
});
