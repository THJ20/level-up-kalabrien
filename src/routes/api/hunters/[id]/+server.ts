import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { hunterProfile } from '#lib/server/overview.ts';

export const GET = api((event) => hunterProfile(getApp().ctx, event.params.id ?? ''));
