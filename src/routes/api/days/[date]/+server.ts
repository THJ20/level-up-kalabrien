import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { dayDetail } from '#lib/server/overview.ts';

export const GET = api((event, hunter) => dayDetail(getApp().ctx, hunter.id, event.params.date ?? ''));
