import { WARMUP_START, addDays, type DayStatus, type LocalDate, type PlanUnit } from '#lib/domain/index.ts';

/** Kennzahl im Diagramm. Planerfüllung ist zwischen Spielern mit verschiedenen Plänen vergleichbar. */
export type Metric = 'progress' | 'reps' | 'minutes' | 'bonus';
export type View = 'day' | 'week' | 'cumulative';
export type RangePreset = '7' | '30' | 'all';

export interface StatsDay {
	date: LocalDate;
	status: DayStatus;
	progress: number;
	reps: number;
	minutes: number;
	km: number;
	byExercise: Record<string, number>;
	bonusPoints: number;
	overtimePoints: number;
}

export interface StatsExercise {
	key: string;
	name: string;
	unit: PlanUnit;
}

export interface Point {
	key: string;
	label: string;
	value: number;
}

export const METRIC_LABELS: Record<Metric, string> = {
	progress: 'Planerfüllung in %',
	reps: 'Wiederholungen',
	minutes: 'Minuten',
	bonus: 'Bonuspunkte'
};

/** Kennzahlen, die gemittelt statt summiert werden. */
function isAverage(metric: Metric): boolean {
	return metric === 'progress';
}

export function metricValue(day: StatsDay, metric: Metric): number {
	switch (metric) {
		case 'progress':
			return Math.round(day.progress * 1000) / 10;
		case 'bonus':
			return day.bonusPoints + day.overtimePoints;
		default:
			return day[metric];
	}
}

function toUtc(date: LocalDate): Date {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

/** Montag der Woche, in der der Tag liegt. */
export function weekStart(date: LocalDate): LocalDate {
	const weekday = (toUtc(date).getUTCDay() + 6) % 7;
	return addDays(date, -weekday);
}

/** ISO-Kalenderwoche (Woche mit dem ersten Donnerstag ist KW 1). */
export function isoWeek(date: LocalDate): number {
	const thursday = toUtc(addDays(weekStart(date), 3));
	const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
	return Math.floor((thursday.getTime() - yearStart.getTime()) / 86_400_000 / 7) + 1;
}

function shortDate(date: LocalDate): string {
	return `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Reihe aus beliebigen Tageswerten, pro Tag, Woche oder kumuliert (Mittelwerte laufen als gleitendes Mittel). */
export function seriesOf(days: readonly StatsDay[], value: (day: StatsDay) => number, view: View, average = false): Point[] {
	if (view === 'week') {
		const weeks = new Map<LocalDate, { sum: number; count: number }>();
		for (const day of days) {
			const key = weekStart(day.date);
			const entry = weeks.get(key) ?? { sum: 0, count: 0 };
			entry.sum += value(day);
			entry.count += 1;
			weeks.set(key, entry);
		}
		return [...weeks.entries()].map(([key, entry]) => ({
			key,
			label: `KW ${isoWeek(key)}`,
			value: round(average ? entry.sum / entry.count : entry.sum)
		}));
	}
	let running = 0;
	return days.map((day, index) => {
		const current = value(day);
		running += current;
		const cumulative = average ? running / (index + 1) : running;
		return { key: day.date, label: shortDate(day.date), value: round(view === 'cumulative' ? cumulative : current) };
	});
}

export function series(days: readonly StatsDay[], metric: Metric, view: View): Point[] {
	return seriesOf(days, (day) => metricValue(day, metric), view, isAverage(metric));
}

/** Die meistgemachten Wiederholungs-Übungen, der Rest als `others`. */
export function topExercises(
	days: readonly StatsDay[],
	exercises: readonly StatsExercise[],
	count = 4
): { top: StatsExercise[]; others: StatsExercise[] } {
	const totals = new Map<string, number>();
	for (const day of days) {
		for (const [key, value] of Object.entries(day.byExercise)) totals.set(key, (totals.get(key) ?? 0) + value);
	}
	const reps = exercises
		.filter((exercise) => exercise.unit === 'reps' && (totals.get(exercise.key) ?? 0) > 0)
		.sort((a, b) => (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0));
	return { top: reps.slice(0, count), others: reps.slice(count) };
}

export interface Kpis {
	reps: number;
	minutes: number;
	km: number;
	bonus: number;
	/** Mittlere Planerfüllung der gewerteten Tage in Prozent. */
	averageProgress: number;
	best: { date: LocalDate; value: number } | null;
	fulfilled: number;
	sick: number;
	missed: number;
	days: number;
}

export function kpis(days: readonly StatsDay[]): Kpis {
	let reps = 0;
	let minutes = 0;
	let km = 0;
	let bonus = 0;
	let best: Kpis['best'] = null;
	for (const day of days) {
		reps += day.reps;
		minutes += day.minutes;
		km += day.km;
		bonus += day.bonusPoints + day.overtimePoints;
		if (day.reps > 0 && (!best || day.reps > best.value)) best = { date: day.date, value: day.reps };
	}
	const scored = days.filter((day) => day.status !== 'unscored' && day.status !== 'warmup');
	const progress = scored.reduce((sum, day) => sum + day.progress, 0);
	return {
		reps,
		minutes,
		km: round(km),
		bonus,
		averageProgress: scored.length > 0 ? Math.round((progress / scored.length) * 100) : 0,
		best,
		fulfilled: days.filter((day) => day.status === 'fulfilled').length,
		sick: days.filter((day) => day.status === 'sick').length,
		missed: days.filter((day) => day.status === 'missed').length,
		days: days.length
	};
}

export function rangeFor(preset: RangePreset, today: LocalDate): { from: LocalDate; to: LocalDate } {
	if (preset === 'all') return { from: WARMUP_START, to: today };
	const from = addDays(today, -(Number(preset) - 1));
	return { from: from < WARMUP_START ? WARMUP_START : from, to: today };
}
