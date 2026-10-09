import { localDateOf, type LocalDate } from '$lib/domain';
import type { Clock } from './clock';
import type { AppDb } from './db/client';

export interface Notification {
	title: string;
	body: string;
	url: string;
	tag?: string;
}

export type NotificationKind = 'reminder' | 'vote';

export interface Notifier {
	notify(hunterIds: readonly string[], notification: Notification, kind: NotificationKind): void;
}

export type ChangeTopic = 'board' | 'feed' | 'votes' | 'hunters' | 'catalog';

export interface ChangeBus {
	publish(topics: readonly ChangeTopic[]): void;
	subscribe(listener: (topics: readonly ChangeTopic[]) => void): () => void;
}

export interface ServiceContext {
	db: AppDb;
	clock: Clock;
	notifier: Notifier;
	bus: ChangeBus;
	/** Zufallsindex 0 bis count − 1, z. B. für den Losentscheid. */
	random: (count: number) => number;
}

export function createChangeBus(): ChangeBus {
	const listeners = new Set<(topics: readonly ChangeTopic[]) => void>();
	return {
		publish(topics) {
			for (const listener of listeners) listener(topics);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}

export function todayOf(ctx: ServiceContext): LocalDate {
	return localDateOf(ctx.clock.now());
}
