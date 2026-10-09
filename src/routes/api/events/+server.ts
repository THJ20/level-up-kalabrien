import { getApp } from '#lib/server/app.ts';
import { api } from '#lib/server/http.ts';
import { createEventStream } from '#lib/server/sse.ts';

export const GET = api(
	(event) =>
		new Response(createEventStream(getApp().ctx.bus, event.request.signal), {
			headers: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache, no-transform',
				'x-accel-buffering': 'no'
			}
		})
);
