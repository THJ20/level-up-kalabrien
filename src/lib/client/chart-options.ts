import type { Metric, Point, View } from './stats';

/** Geprüfte Diagrammfarben für den dunklen Panel-Grund (#140a24), siehe Palette-Validator. */
export const EXERCISE_COLORS = {
	pushups: '#8b5cf6',
	squats: '#2b9fd6',
	situps: '#d6408a',
	bonus: '#b8860b'
} as const;

const PERSON_COLORS = ['#8b5cf6', '#2b9fd6', '#d6408a', '#b8860b'];

/** Farbe und Strichart folgen dem Hunter (feste Reihenfolge aller Hunter), nie dem Rang. */
export function personStyle(index: number): { color: string; dashed: boolean } {
	return { color: PERSON_COLORS[index % PERSON_COLORS.length], dashed: index >= PERSON_COLORS.length };
}

const INK = '#f0e9ff';
const INK_DIM = '#a194bd';
const SURFACE = '#140a24';
const GRID = 'rgba(164, 124, 255, 0.1)';
const AXIS = 'rgba(164, 124, 255, 0.28)';

export interface ChartSeries {
	name: string;
	color: string;
	dashed?: boolean;
	points: Point[];
}

export const METRIC_LABELS: Record<Metric, string> = {
	all: 'Wiederholungen gesamt',
	pushups: 'Liegestütze',
	squats: 'Kniebeugen',
	situps: 'Sit-ups',
	bonus: 'Bonuspunkte'
};

/** ECharts-Option: gestapelte Balken für mehrere Übungen, sonst Balken (eine Reihe) oder Linien (Vergleich, kumuliert). */
export function chartOption(input: { series: ChartSeries[]; view: View; stacked: boolean }) {
	const labels = input.series[0]?.points.map((point) => point.label) ?? [];
	const asLine = input.view === 'cumulative' || (!input.stacked && input.series.length > 1);
	const zoom = labels.length > 21;
	const multi = input.series.length > 1;

	return {
		backgroundColor: 'transparent',
		animationDuration: 500,
		textStyle: { color: INK_DIM, fontFamily: 'Barlow, system-ui, sans-serif' },
		grid: { left: 8, right: asLine && multi ? 74 : 12, top: multi ? 40 : 16, bottom: zoom ? 54 : 12, containLabel: true },
		legend: multi
			? { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { color: INK_DIM } }
			: undefined,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: asLine ? 'line' : 'shadow', lineStyle: { color: AXIS }, shadowStyle: { color: 'rgba(164,124,255,0.08)' } },
			backgroundColor: SURFACE,
			borderColor: '#5d3fa0',
			textStyle: { color: INK },
			valueFormatter: (value: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)
		},
		xAxis: {
			type: 'category',
			data: labels,
			axisLine: { lineStyle: { color: AXIS } },
			axisTick: { show: false },
			axisLabel: { color: INK_DIM, hideOverlap: true }
		},
		yAxis: {
			type: 'value',
			splitLine: { lineStyle: { color: GRID } },
			axisLabel: { color: INK_DIM }
		},
		dataZoom: zoom
			? [
					{ type: 'inside', start: Math.max(0, 100 - (21 / labels.length) * 100), end: 100 },
					{
						type: 'slider',
						height: 18,
						bottom: 8,
						borderColor: AXIS,
						fillerColor: 'rgba(164,124,255,0.16)',
						handleStyle: { color: '#a47cff' },
						textStyle: { color: INK_DIM },
						start: Math.max(0, 100 - (21 / labels.length) * 100),
						end: 100
					}
				]
			: undefined,
		series: input.series.map((entry, index) =>
			asLine
				? {
						name: entry.name,
						type: 'line',
						data: entry.points.map((point) => point.value),
						smooth: false,
						showSymbol: labels.length <= 14,
						symbol: 'circle',
						symbolSize: 8,
						lineStyle: { width: 2, color: entry.color, type: entry.dashed ? 'dashed' : 'solid' },
						itemStyle: { color: entry.color, borderColor: SURFACE, borderWidth: 2 },
						endLabel: multi ? { show: true, formatter: '{a}', color: INK, fontSize: 12 } : undefined,
						emphasis: { focus: 'series' }
					}
				: {
						name: entry.name,
						type: 'bar',
						stack: input.stacked ? 'total' : undefined,
						barMaxWidth: 22,
						data: entry.points.map((point) => point.value),
						itemStyle: {
							color: entry.color,
							borderColor: SURFACE,
							borderWidth: 1,
							borderRadius: !input.stacked || index === input.series.length - 1 ? [4, 4, 0, 0] : 0
						},
						emphasis: { focus: 'series' }
					}
		)
	};
}
