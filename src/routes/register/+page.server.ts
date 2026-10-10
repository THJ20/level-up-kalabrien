import { redirect } from '@sveltejs/kit';
import { getApp } from '#lib/server/app.ts';
import { inspectInvite } from '#lib/server/auth/invites.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.hunter) redirect(303, '/');
	const token = url.searchParams.get('token') ?? '';
	return { token, ...inspectInvite(getApp().ctx, token) };
};
