import { TIME_ZONE, UNIT_LABELS, daysBetween, localDateOf, type LocalDate, type PlanUnit } from '#lib/domain/index.ts';

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function parts(date: LocalDate): { year: number; month: number; day: number; weekday: number } {
	const [year, month, day] = date.split('-').map(Number);
	const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
	return { year, month, day, weekday };
}

/** `2026-10-12` wird zu `Mo, 12.10.` */
export function dayLabel(date: LocalDate): string {
	const { month, day, weekday } = parts(date);
	return `${WEEKDAYS_SHORT[weekday]}, ${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
}

const longFormatter = new Intl.DateTimeFormat('de-DE', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'UTC'
});

/** `2026-10-12` wird zu `Montag, 12. Oktober 2026` */
export function longDayLabel(date: LocalDate): string {
	const { year, month, day } = parts(date);
	return longFormatter.format(new Date(Date.UTC(year, month - 1, day))).replace(',', ',');
}

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
	hour: '2-digit',
	minute: '2-digit',
	timeZone: TIME_ZONE
});

export function clockTime(instant: Date): string {
	return timeFormatter.format(instant);
}

/** Kurze relative Zeitangabe für Feed und Listen. */
export function relativeTime(instant: Date, now: Date): string {
	const seconds = Math.round((now.getTime() - instant.getTime()) / 1000);
	if (seconds < 60) return 'gerade eben';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `vor ${minutes} Min.`;
	const days = daysBetween(localDateOf(instant), localDateOf(now));
	if (days === 0) return `vor ${Math.floor(minutes / 60)} Std.`;
	if (days === 1) return 'gestern';
	return dayLabel(localDateOf(instant));
}

const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export function points(value: number): string {
	return numberFormatter.format(Math.round(value));
}

export function count(value: number): string {
	return numberFormatter.format(value);
}

/** Millisekunden als `hh:mm:ss`. */
export function countdown(ms: number): string {
	const total = Math.max(0, Math.floor(ms / 1000));
	return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
		.map((value) => String(value).padStart(2, '0'))
		.join(':');
}

/** Zahl in deutscher Schreibweise mit höchstens einer Nachkommastelle, z. B. `2,5`. */
export function decimal(value: number): string {
	return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
}

/** Wert mit Einheit, z. B. `40 Wdh.`, `3 Min.` oder `2,5 km`. */
export function amount(value: number, unit: PlanUnit): string {
	return `${decimal(value)} ${UNIT_LABELS[unit].short}`;
}
