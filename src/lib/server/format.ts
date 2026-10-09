import type { LocalDate } from '$lib/domain';

/** `2026-10-12` wird zu `12.10.` */
export function shortDate(date: LocalDate): string {
	const [, month, day] = date.split('-');
	return `${day}.${month}.`;
}
