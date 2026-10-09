import { getApp } from '#lib/server/app.ts';
import { publicApi } from '#lib/server/http.ts';

export const GET = publicApi(() => ({ publicKey: getApp().vapid.publicKey }));
