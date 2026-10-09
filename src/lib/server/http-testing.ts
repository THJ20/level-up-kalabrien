import type { RequestEvent } from '@sveltejs/kit';
import { createApp, setApp, type App } from './app';
import { authenticate } from './http';
import { FakeClock } from './testing';

export interface TestApp {
	app: App;
	clock: FakeClock;
	adminToken: string;
	pushes: { endpoint: string; payload: unknown }[];
}

/** App mit Speicher-Datenbank, steuerbarer Uhr und aufgezeichnetem Push; wird als aktuelle App gesetzt. */
export function createTestApp(nowIso = '2026-10-09T10:00:00Z'): TestApp {
	const clock = new FakeClock(nowIso);
	const log: string[] = [];
	const pushes: TestApp['pushes'] = [];
	const app = createApp(
		{
			databasePath: ':memory:',
			backupDir: 'data/test-backups',
			goLiveDate: '2026-10-09',
			origin: 'https://lvl.test',
			vapidSubject: 'https://lvl.test'
		},
		{
			clock,
			startJobs: false,
			log: (line) => log.push(line),
			generateVapidKeys: () => ({ publicKey: 'test-public-key', privateKey: 'test-private-key' }),
			transport: {
				async send(subscription, payload) {
					pushes.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) });
					return { statusCode: 201 };
				}
			}
		}
	);
	setApp(app);
	const adminToken = /token=([\w-]+)/.exec(log.join('\n'))?.[1] ?? '';
	return { app, clock, adminToken, pushes };
}

/** Minimaler Cookie-Speicher für Tests (deckt get, getAll, set, delete ab). */
class CookieJar {
	readonly values = new Map<string, string>();

	get(name: string) {
		return this.values.get(name);
	}

	getAll() {
		return [...this.values.entries()].map(([name, value]) => ({ name, value }));
	}

	set(name: string, value: string) {
		this.values.set(name, value);
	}

	delete(name: string) {
		this.values.delete(name);
	}

	serialize(name: string, value: string) {
		return `${name}=${value}`;
	}
}

export interface CallOptions {
	method?: string;
	path: string;
	body?: unknown;
	token?: string;
	params?: Record<string, string>;
}

export interface CallResult {
	status: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	body: any;
	cookies: CookieJar;
}

/** Ruft einen Endpunkt-Handler direkt auf, so wie SvelteKit es nach `handle` täte. */
export async function call(
	handler: (event: RequestEvent) => Promise<Response>,
	options: CallOptions
): Promise<CallResult> {
	const url = new URL(options.path, 'https://lvl.test');
	const cookies = new CookieJar();
	if (options.token) cookies.set('session', options.token);
	const request = new Request(url, {
		method: options.method ?? 'GET',
		headers: options.body !== undefined ? { 'content-type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined
	});
	const event = {
		request,
		url,
		params: options.params ?? {},
		cookies,
		locals: { hunter: null, sessionToken: null },
		getClientAddress: () => '127.0.0.1',
		setHeaders: () => {},
		platform: undefined,
		route: { id: null },
		isDataRequest: false,
		isSubRequest: false,
		fetch
	} as unknown as RequestEvent;
	authenticate(event);
	const response = await handler(event);
	const text = await response.text();
	return { status: response.status, body: text ? JSON.parse(text) : null, cookies };
}
