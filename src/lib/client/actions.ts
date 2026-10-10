import { invalidate } from '$app/navigation';
import type { Effort, Exercise, LocalDate } from '#lib/domain/index.ts';
import { apiFetch, isNetworkError } from './api';
import type { QueuedEntry } from './offline';
import { offlineQueue } from './queue.svelte';

export type Delivery = 'sent' | 'queued';

/** Lädt alle Seitendaten neu, nachdem sich etwas geändert hat. */
export function refresh(): Promise<void> {
	return invalidate('app:data');
}

export function newClientId(): string {
	return crypto.randomUUID();
}

/** Schickt einen Eintrag an die API. Ohne Netz landet er in der Offline-Warteschlange. */
async function sendOrQueue(entry: Omit<QueuedEntry, 'createdAt'>): Promise<Delivery> {
	try {
		await apiFetch(entry.path, { method: entry.method, body: entry.body });
		return 'sent';
	} catch (error) {
		if (!isNetworkError(error)) throw error;
		await offlineQueue.add({ ...entry, createdAt: Date.now() });
		return 'queued';
	}
}

export function addSet(date: LocalDate, exercise: Exercise, reps: number): Promise<Delivery> {
	const clientId = newClientId();
	return sendOrQueue({
		id: clientId,
		kind: 'set',
		method: 'POST',
		path: '/api/sets',
		body: { date, exercise, reps, clientId }
	});
}

export async function updateSet(id: string, reps: number): Promise<void> {
	await apiFetch(`/api/sets/${id}`, { method: 'PATCH', body: { reps } });
}

export async function deleteSet(id: string): Promise<void> {
	await apiFetch(`/api/sets/${id}`, { method: 'DELETE' });
}

export function reportSick(date: LocalDate): Promise<Delivery> {
	return sendOrQueue({ id: `sick-${date}`, kind: 'sick', method: 'PUT', path: `/api/sick/${date}` });
}

export async function withdrawSick(date: LocalDate): Promise<void> {
	await apiFetch(`/api/sick/${date}`, { method: 'DELETE' });
}

export interface BonusPayload {
	exerciseId: string;
	date: LocalDate;
	minutes?: number | null;
	reps?: number | null;
	effort: Effort;
	distanceKm?: number | null;
}

export function addBonus(payload: BonusPayload): Promise<Delivery> {
	const clientId = newClientId();
	return sendOrQueue({
		id: clientId,
		kind: 'bonus',
		method: 'POST',
		path: '/api/bonus',
		body: { ...payload, clientId }
	});
}

export async function deleteBonus(id: string): Promise<void> {
	await apiFetch(`/api/bonus/${id}`, { method: 'DELETE' });
}
