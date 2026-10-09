import { getApp } from '#lib/server/app.ts';
import { api, parseQuery } from '#lib/server/http.ts';
import { leaderboard } from '#lib/server/overview.ts';
import { RangeQuery } from '#lib/server/schemas.ts';

export const GET = api((event) => leaderboard(getApp().ctx, parseQuery(event, RangeQuery)));
