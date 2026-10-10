import { createStore, del, entries, set } from 'idb-keyval';

export type QueuedKind = 'set' | 'bonus' | 'sick';
export type SendResult = 'ok' | 'rejected' | 'offline';

/** Eintrag, der ohne Netz erfasst wurde. Die ID ist zugleich die `clientId`, der Server erkennt Doppelte. */
export interface QueuedEntry {
	id: string;
	kind: QueuedKind;
	method: 'POST' | 'PUT';
	path: string;
	body?: Record<string, unknown>;
	createdAt: number;
}

export interface QueueStore {
	list(): Promise<QueuedEntry[]>;
	put(entry: QueuedEntry): Promise<void>;
	remove(id: string): Promise<void>;
}

export function memoryStore(initial: QueuedEntry[] = []): QueueStore {
	const items = new Map(initial.map((entry) => [entry.id, entry]));
	return {
		async list() {
			return [...items.values()].sort((a, b) => a.createdAt - b.createdAt);
		},
		async put(entry) {
			items.set(entry.id, entry);
		},
		async remove(id) {
			items.delete(id);
		}
	};
}

export function indexedDbStore(): QueueStore {
	const store = createStore('level-up', 'offline-queue');
	return {
		async list() {
			const all = await entries<string, QueuedEntry>(store);
			return all.map(([, entry]) => entry).sort((a, b) => a.createdAt - b.createdAt);
		},
		put: (entry) => set(entry.id, entry, store),
		remove: (id) => del(id, store)
	};
}

/** Sendet wartende Einträge in Erfassungsreihenfolge. Bei einem Netzfehler bleibt der Rest liegen. */
export async function flushQueue(
	store: QueueStore,
	send: (entry: QueuedEntry) => Promise<SendResult>
): Promise<{ sent: number; rejected: QueuedEntry[]; remaining: number }> {
	const pending = await store.list();
	let sent = 0;
	const rejected: QueuedEntry[] = [];
	for (const entry of pending) {
		const result = await send(entry);
		if (result === 'offline') break;
		await store.remove(entry.id);
		if (result === 'ok') sent += 1;
		else rejected.push(entry);
	}
	return { sent, rejected, remaining: (await store.list()).length };
}

export async function sendOverNetwork(entry: QueuedEntry): Promise<SendResult> {
	try {
		const response = await fetch(entry.path, {
			method: entry.method,
			headers: entry.body ? { 'content-type': 'application/json' } : undefined,
			body: entry.body ? JSON.stringify(entry.body) : undefined,
			credentials: 'same-origin'
		});
		if (response.ok) return 'ok';
		return response.status >= 500 || response.status === 401 ? 'offline' : 'rejected';
	} catch {
		return 'offline';
	}
}
