import { describe, expect, it } from 'vitest';
import { flushQueue, memoryStore, type QueuedEntry } from './offline';

function entry(id: string, createdAt: number): QueuedEntry {
	return {
		id,
		kind: 'set',
		method: 'POST',
		path: '/api/sets',
		body: { date: '2026-10-12', exercise: 'pushups', reps: 10, clientId: id },
		createdAt
	};
}

describe('Offline-Warteschlange', () => {
	it('sendet in Reihenfolge und entfernt gesendete und abgelehnte Einträge', async () => {
		const store = memoryStore([entry('b', 2), entry('a', 1), entry('c', 3)]);
		const order: string[] = [];
		const result = await flushQueue(store, async (queued) => {
			order.push(queued.id);
			return queued.id === 'b' ? 'rejected' : 'ok';
		});
		expect(order).toEqual(['a', 'b', 'c']);
		expect(result).toMatchObject({ sent: 2, remaining: 0 });
		expect(result.rejected.map((queued) => queued.id)).toEqual(['b']);
		expect(await store.list()).toEqual([]);
	});

	it('hört beim ersten Netzfehler auf und behält den Rest', async () => {
		const store = memoryStore([entry('a', 1), entry('b', 2)]);
		const result = await flushQueue(store, async (queued) => (queued.id === 'a' ? 'offline' : 'ok'));
		expect(result).toMatchObject({ sent: 0, remaining: 2 });
		expect((await store.list()).map((queued) => queued.id)).toEqual(['a', 'b']);
	});
});
