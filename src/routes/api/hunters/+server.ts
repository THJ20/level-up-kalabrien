import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { listActiveHunters } from '#lib/server/hunters.ts';

export const GET = api(() => ({ hunters: listActiveHunters(getApp().ctx) }));
