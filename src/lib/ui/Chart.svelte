<script lang="ts">
	import { onMount } from 'svelte';
	import type { ECharts, EChartsCoreOption } from 'echarts/core';

	let { option, height = 300, label }: { option: EChartsCoreOption; height?: number; label: string } = $props();

	let element: HTMLDivElement | undefined = $state();
	let chart: ECharts | undefined = $state();

	onMount(() => {
		let disposed = false;
		let observer: ResizeObserver | undefined;
		void (async () => {
			const [echarts, charts, components, renderers] = await Promise.all([
				import('echarts/core'),
				import('echarts/charts'),
				import('echarts/components'),
				import('echarts/renderers')
			]);
			echarts.use([
				charts.BarChart,
				charts.LineChart,
				components.GridComponent,
				components.TooltipComponent,
				components.LegendComponent,
				components.DataZoomComponent,
				renderers.CanvasRenderer
			]);
			if (disposed || !element) return;
			chart = echarts.init(element, undefined, { renderer: 'canvas' });
			observer = new ResizeObserver(() => chart?.resize());
			observer.observe(element);
		})();
		return () => {
			disposed = true;
			observer?.disconnect();
			chart?.dispose();
		};
	});

	$effect(() => {
		chart?.setOption(option, true);
	});
</script>

<div class="chart" bind:this={element} style:height="{height}px" role="img" aria-label={label}></div>

<style>
	.chart {
		width: 100%;
		min-width: 0;
	}
</style>
