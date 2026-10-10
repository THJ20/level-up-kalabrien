import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self } from '$app/service-worker';

const STATIC_CACHE = `static-${version}`;
const PAGE_CACHE = 'pages';
const PRECACHE = [...immutable, ...assets].map(({ path }) => (path.startsWith('/') ? path : `/${path}`));
const PRECACHED = new Set(PRECACHE);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

const OFFLINE_PAGE = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Level Up</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#05030a;color:#f0e9ff;font-family:system-ui;text-align:center;padding:24px">
<div><p style="letter-spacing:.3em;color:#a194bd">[ SYSTEM ]</p><h1 style="letter-spacing:.1em">KEINE VERBINDUNG</h1>
<p style="color:#a194bd">Öffne die App einmal mit Netz, dann geht sie auch offline.</p></div></body></html>`;

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

	if (PRECACHED.has(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						void caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(async () => {
					const cache = await caches.open(PAGE_CACHE);
					return (
						(await cache.match(request)) ??
						(await cache.match('/')) ??
						new Response(OFFLINE_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } })
					);
				})
		);
	}
});

self.addEventListener('push', (event) => {
	const data = (() => {
		try {
			return event.data?.json() as { title?: string; body?: string; url?: string; tag?: string };
		} catch {
			return { title: 'Level Up', body: event.data?.text() };
		}
	})();
	event.waitUntil(
		self.registration.showNotification(data?.title ?? 'Level Up · Kalabrien', {
			body: data?.body,
			tag: data?.tag,
			icon: '/icons/icon-192.png',
			badge: '/icons/badge-96.png',
			data: { url: data?.url ?? '/' }
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = new URL((event.notification.data?.url as string | undefined) ?? '/', self.location.origin).href;
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
			for (const client of windows) {
				if ('focus' in client) {
					await client.focus();
					if ('navigate' in client) await client.navigate(target);
					return;
				}
			}
			await self.clients.openWindow(target);
		})
	);
});
