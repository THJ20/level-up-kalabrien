import { getApp } from '#lib/server/app.ts';
import { badgeOverview } from '#lib/server/badges.ts';
import { api } from '#lib/server/http.ts';

export const GET = api((_event, hunter) => badgeOverview(getApp().ctx, hunter.id));
