import { invalidate } from '$app/navigation';
import type { Effort, Exercise, LocalDate } from '#lib/domain/index.ts';
import { apiFetch } from './api';

/** Lädt alle Seitendaten neu, nachdem sich etwas geändert hat. */
export function refresh(): Promise<void> {
	return invalidate('app:data');
}

export function newClientId(): string {
	return crypto.randomUUID();
}

export async function addSet(date: LocalDate, exercise: Exercise, reps: number): Promise<void> {
	await apiFetch('/api/sets', { body: { date, exercise, reps, clientId: newClientId() } });
}

export async function updateSet(id: string, reps: number): Promise<void> {
	await apiFetch(`/api/sets/${id}`, { method: 'PATCH', body: { reps } });
}

export async function deleteSet(id: string): Promise<void> {
	await apiFetch(`/api/sets/${id}`, { method: 'DELETE' });
}

export async function reportSick(date: LocalDate): Promise<void> {
	await apiFetch(`/api/sick/${date}`, { method: 'PUT' });
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

export async function addBonus(payload: BonusPayload): Promise<void> {
	await apiFetch('/api/bonus', { body: { ...payload, clientId: newClientId() } });
}

export async function deleteBonus(id: string): Promise<void> {
	await apiFetch(`/api/bonus/${id}`, { method: 'DELETE' });
}
