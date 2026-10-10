import { flushQueue, indexedDbStore, sendOverNetwork, type QueuedEntry, type QueueStore } from './offline';

/** Reaktiver Zustand der Offline-Warteschlange für die Oberfläche. */
class OfflineQueue {
	entries = $state<QueuedEntry[]>([]);
	rejected = $state(0);
	#store: QueueStore | null = null;
	#flushing = false;

	#getStore(): QueueStore {
		this.#store ??= indexedDbStore();
		return this.#store;
	}

	async load(): Promise<void> {
		try {
			this.entries = await this.#getStore().list();
		} catch {
			this.entries = [];
		}
	}

	async add(entry: QueuedEntry): Promise<void> {
		await this.#getStore().put(entry);
		await this.load();
	}

	/** Sendet alles, was wartet. Liefert die Zahl erfolgreich gesendeter Einträge. */
	async flush(): Promise<number> {
		if (this.#flushing || this.entries.length === 0) return 0;
		this.#flushing = true;
		try {
			const result = await flushQueue(this.#getStore(), sendOverNetwork);
			this.rejected += result.rejected.length;
			await this.load();
			return result.sent;
		} catch {
			return 0;
		} finally {
			this.#flushing = false;
		}
	}
}

export const offlineQueue = new OfflineQueue();
