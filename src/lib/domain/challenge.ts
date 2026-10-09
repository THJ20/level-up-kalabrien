/** Kalendertag in Europe/Berlin im Format JJJJ-MM-TT. */
export type LocalDate = string;

export const TIME_ZONE = 'Europe/Berlin';
export const CHALLENGE_START: LocalDate = '2026-10-09';
export const CHALLENGE_END: LocalDate = '2027-04-28';
export const DEPARTURE: LocalDate = '2027-04-29';
export const CHALLENGE_DAYS = 202;

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) return false;
	const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return utc.toISOString().slice(0, 10) === value;
}

function toUtcMs(date: LocalDate): number {
	const [year, month, day] = date.split('-').map(Number);
	return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): LocalDate {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
	return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
	return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function challengeDayNumber(date: LocalDate): number | null {
	const dayNumber = daysBetween(CHALLENGE_START, date) + 1;
	return dayNumber >= 1 && dayNumber <= CHALLENGE_DAYS ? dayNumber : null;
}

export function challengeDays(): LocalDate[] {
	return Array.from({ length: CHALLENGE_DAYS }, (_, index) => addDays(CHALLENGE_START, index));
}

export function daysUntilDeparture(today: LocalDate): number {
	return Math.max(0, daysBetween(today, DEPARTURE));
}

const berlinFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
});

interface BerlinParts {
	date: LocalDate;
	hour: number;
	minute: number;
	second: number;
}

function berlinParts(instant: Date): BerlinParts {
	const parts: Record<string, string> = {};
	for (const part of berlinFormatter.formatToParts(instant)) parts[part.type] = part.value;
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second)
	};
}

export function localDateOf(instant: Date): LocalDate {
	return berlinParts(instant).date;
}

export function minutesOfDay(instant: Date): number {
	const parts = berlinParts(instant);
	return parts.hour * 60 + parts.minute;
}

function berlinOffsetMs(instant: Date): number {
	const parts = berlinParts(instant);
	const wallClockAsUtc =
		toUtcMs(parts.date) + ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000;
	return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Zeitpunkt, an dem der Kalendertag in Berlin beginnt (00:00 Uhr Ortszeit). */
export function startOfDay(date: LocalDate): Date {
	const midnightAsUtc = toUtcMs(date);
	let instant = midnightAsUtc - berlinOffsetMs(new Date(midnightAsUtc));
	instant = midnightAsUtc - berlinOffsetMs(new Date(instant));
	return new Date(instant);
}

/** Zeitpunkt, an dem der Kalendertag in Berlin endet (Beginn des Folgetags). */
export function endOfDay(date: LocalDate): Date {
	return startOfDay(addDays(date, 1));
}
