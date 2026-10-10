import {
	CHALLENGE_START,
	EXERCISES,
	addDays,
	emptyTotals,
	type DayStatus,
	type ExerciseTotals,
	type LocalDate
} from '#lib/domain/index.ts';

export type Metric = 'all' | 'pushups' | 'squats' | 'situps' | 'bonus';
export type View = 'day' | 'week' | 'cumulative';
export type RangePreset = '7' | '30' | 'all';

export interface StatsDay {
	date: LocalDate;
	status: DayStatus;
	totals: ExerciseTotals;
	bonusPoints: number;
	overtimePoints: number;
}

export interface Point {
	key: string;
	label: string;
	value: number;
}

export function metricValue(day: StatsDay, metric: Metric): number {
	if (metric === 'bonus') return day.bonusPoints + day.overtimePoints;
	if (metric === 'all') return EXERCISES.reduce((sum, exercise) => sum + day.totals[exercise], 0);
	return day.totals[metric];
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

export function series(days: readonly StatsDay[], metric: Metric, view: View): Point[] {
	if (view === 'week') {
		const weeks = new Map<LocalDate, number>();
		for (const day of days) {
			const key = weekStart(day.date);
			weeks.set(key, (weeks.get(key) ?? 0) + metricValue(day, metric));
		}
		return [...weeks.entries()].map(([key, value]) => ({ key, label: `KW ${isoWeek(key)}`, value }));
	}
	let running = 0;
	return days.map((day) => {
		const value = metricValue(day, metric);
		running += value;
		return { key: day.date, label: shortDate(day.date), value: view === 'cumulative' ? running : value };
	});
}

export interface Kpis {
	totals: ExerciseTotals;
	bonus: number;
	average: number;
	best: { date: LocalDate; value: number } | null;
	fulfilled: number;
	sick: number;
	missed: number;
	days: number;
}

export function kpis(days: readonly StatsDay[]): Kpis {
	const totals = emptyTotals();
	let bonus = 0;
	let best: Kpis['best'] = null;
	for (const day of days) {
		for (const exercise of EXERCISES) totals[exercise] += day.totals[exercise];
		bonus += day.bonusPoints + day.overtimePoints;
		const value = metricValue(day, 'all');
		if (value > 0 && (!best || value > best.value)) best = { date: day.date, value };
	}
	const scored = days.filter((day) => day.status !== 'unscored');
	const sum = EXERCISES.reduce((total, exercise) => total + totals[exercise], 0);
	return {
		totals,
		bonus,
		average: scored.length > 0 ? Math.round(sum / scored.length) : 0,
		best,
		fulfilled: days.filter((day) => day.status === 'fulfilled').length,
		sick: days.filter((day) => day.status === 'sick').length,
		missed: days.filter((day) => day.status === 'missed').length,
		days: days.length
	};
}

export function rangeFor(preset: RangePreset, today: LocalDate): { from: LocalDate; to: LocalDate } {
	if (preset === 'all') return { from: CHALLENGE_START, to: today };
	const from = addDays(today, -(Number(preset) - 1));
	return { from: from < CHALLENGE_START ? CHALLENGE_START : from, to: today };
}
