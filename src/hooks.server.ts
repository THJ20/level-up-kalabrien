import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getApp } from '#lib/server/app.ts';
import { authenticate } from '#lib/server/http.ts';

export const init: ServerInit = () => {
	getApp();
};

export const handle: Handle = async ({ event, resolve }) => {
	authenticate(event);
	return resolve(event);
};
