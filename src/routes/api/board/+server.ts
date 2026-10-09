import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { todayBoard } from '#lib/server/overview.ts';

export const GET = api(() => ({ board: todayBoard(getApp().ctx) }));
