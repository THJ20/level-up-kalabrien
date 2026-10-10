import type { Theme } from '#lib/shared/constants.ts';
import type { Point, View } from './stats';

/**
 * Kategoriale Diagrammfarben in fester Reihenfolge. Mit dem Palette-Validator geprüft
 * auf beiden Panel-Gründen (#140a24 und #1a0f08), auch für alle Paare.
 */
export const SERIES_COLORS = ['#8b5cf6', '#2b9fd6', '#d6408a', '#b8860b'] as const;
/** Zurückhaltendes Grau für die Sammelreihe „Andere“. */
export const OTHERS_COLOR = '#7d7a85';

/** Farbe für eine einzelne Reihe ohne Vergleich: der Akzent des Farbschemas. */
export function singleColor(theme: Theme): string {
	return theme === 'gate' ? '#dd6f2a' : SERIES_COLORS[0];
}

/** Farbe und Strichart folgen dem Hunter (feste Reihenfolge aller Hunter), nie dem Rang. */
export function personStyle(index: number): { color: string; dashed: boolean } {
	return { color: SERIES_COLORS[index % SERIES_COLORS.length], dashed: index >= SERIES_COLORS.length };
}

interface ChartTheme {
	ink: string;
	inkDim: string;
	surface: string;
	border: string;
	grid: string;
	axis: string;
	shadow: string;
	zoomFill: string;
	handle: string;
}

const CHART_THEMES: Record<Theme, ChartTheme> = {
	monarch: {
		ink: '#f0e9ff',
		inkDim: '#a194bd',
		surface: '#140a24',
		border: '#5d3fa0',
		grid: 'rgba(164, 124, 255, 0.1)',
		axis: 'rgba(164, 124, 255, 0.28)',
		shadow: 'rgba(164, 124, 255, 0.08)',
		zoomFill: 'rgba(164, 124, 255, 0.16)',
		handle: '#a47cff'
	},
	gate: {
		ink: '#fdf2e9',
		inkDim: '#c7ab97',
		surface: '#1a0f08',
		border: '#8f4a1c',
		grid: 'rgba(255, 138, 61, 0.1)',
		axis: 'rgba(255, 138, 61, 0.28)',
		shadow: 'rgba(255, 138, 61, 0.08)',
		zoomFill: 'rgba(255, 138, 61, 0.16)',
		handle: '#ff8a3d'
	}
};

export interface ChartSeries {
	name: string;
	color: string;
	dashed?: boolean;
	points: Point[];
}

/** ECharts-Option: gestapelte Balken für mehrere Übungen, sonst Balken (eine Reihe) oder Linien (Vergleich, kumuliert). */
export function chartOption(input: {
	series: ChartSeries[];
	view: View;
	stacked: boolean;
	theme: Theme;
	/** Einheit für Tooltip-Werte, z. B. „ %“. */
	suffix?: string;
}) {
	const { ink, inkDim, surface, grid, axis, ...colors } = CHART_THEMES[input.theme];
	const labels = input.series[0]?.points.map((point) => point.label) ?? [];
	const asLine = input.view === 'cumulative' || (!input.stacked && input.series.length > 1);
	const zoom = labels.length > 21;
	const multi = input.series.length > 1;

	return {
		backgroundColor: 'transparent',
		animationDuration: 500,
		textStyle: { color: inkDim, fontFamily: 'Barlow, system-ui, sans-serif' },
		grid: { left: 8, right: asLine && multi ? 74 : 12, top: multi ? 40 : 16, bottom: zoom ? 54 : 12, containLabel: true },
		legend: multi
			? { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, textStyle: { color: inkDim } }
			: undefined,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: asLine ? 'line' : 'shadow', lineStyle: { color: axis }, shadowStyle: { color: colors.shadow } },
			backgroundColor: surface,
			borderColor: colors.border,
			textStyle: { color: ink },
			valueFormatter: (value: number) =>
				`${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)}${input.suffix ?? ''}`
		},
		xAxis: {
			type: 'category',
			data: labels,
			axisLine: { lineStyle: { color: axis } },
			axisTick: { show: false },
			axisLabel: { color: inkDim, hideOverlap: true }
		},
		yAxis: {
			type: 'value',
			splitLine: { lineStyle: { color: grid } },
			axisLabel: { color: inkDim }
		},
		dataZoom: zoom
			? [
					{ type: 'inside', start: Math.max(0, 100 - (21 / labels.length) * 100), end: 100 },
					{
						type: 'slider',
						height: 18,
						bottom: 8,
						borderColor: axis,
						fillerColor: colors.zoomFill,
						handleStyle: { color: colors.handle },
						textStyle: { color: inkDim },
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
						itemStyle: { color: entry.color, borderColor: surface, borderWidth: 2 },
						endLabel: multi ? { show: true, formatter: '{a}', color: ink, fontSize: 12 } : undefined,
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
							borderColor: surface,
							borderWidth: 1,
							borderRadius: !input.stacked || index === input.series.length - 1 ? [4, 4, 0, 0] : 0
						},
						emphasis: { focus: 'series' }
					}
		)
	};
}
