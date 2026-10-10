<script lang="ts">
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { EXERCISE_COLORS, METRIC_LABELS, chartOption, personStyle, type ChartSeries } from '#lib/client/chart-options.ts';
	import { count, dayLabel, points } from '#lib/client/format.ts';
	import { kpis, rangeFor, series, type Metric, type RangePreset, type StatsDay, type View } from '#lib/client/stats.ts';
	import Chart from '#lib/ui/Chart.svelte';
	import DayGrid from '#lib/ui/DayGrid.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import Segmented from '#lib/ui/Segmented.svelte';

	let { data } = $props();

	type Series = { hunter: { id: string; name: string; color: string }; days: StatsDay[] };

	let preset = $state<RangePreset | 'custom'>('30');
	let customFrom = $state('');
	let customTo = $state('');
	let selected = $state<string[]>([]);
	let metric = $state<Metric>('all');
	let view = $state<View>('day');
	let loaded = $state<{ key: string; series: Series[] } | null>(null);
	let loading = $state(false);
	let error = $state('');

	const meId = $derived(data.me.id);
	const activeSelection = $derived(selected.length > 0 ? selected : [meId]);
	const range = $derived(
		preset === 'custom' && customFrom && customTo && customFrom <= customTo
			? { from: customFrom, to: customTo }
			: rangeFor(preset === 'custom' ? '30' : preset, data.today)
	);
	const key = $derived(`${range.from}|${range.to}|${[...activeSelection].sort().join(',')}`);
	const initialKey = $derived(`${data.initial.range.from}|${data.initial.range.to}|${meId}`);
	const seriesData = $derived<Series[]>(
		loaded?.key === key ? loaded.series : key === initialKey ? data.initial.series : (loaded?.series ?? data.initial.series)
	);

	$effect(() => {
		const wanted = key;
		if (wanted === initialKey || loaded?.key === wanted) return;
		const controller = new AbortController();
		loading = true;
		error = '';
		const params = new URLSearchParams({ from: range.from, to: range.to, hunters: activeSelection.join(',') });
		apiFetch<{ series: Series[] }>(`/api/stats?${params}`)
			.then((result) => {
				if (!controller.signal.aborted) loaded = { key: wanted, series: result.series };
			})
			.catch((caught) => {
				if (!controller.signal.aborted) error = errorMessage(caught);
			})
			.finally(() => {
				if (!controller.signal.aborted) loading = false;
			});
		return () => controller.abort();
	});

	function toggle(id: string) {
		const current = activeSelection;
		selected = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
	}

	const chart = $derived.by(() => {
		if (seriesData.length === 1 && metric === 'all' && view !== 'cumulative') {
			const days = seriesData[0].days;
			const list: ChartSeries[] = (['pushups', 'squats', 'situps'] as const).map((exercise) => ({
				name: METRIC_LABELS[exercise],
				color: EXERCISE_COLORS[exercise],
				points: series(days, exercise, view)
			}));
			return { stacked: true, list };
		}
		const list: ChartSeries[] = seriesData.map((entry) => {
			const style = personStyle(data.hunters.findIndex((hunter) => hunter.id === entry.hunter.id));
			const single = seriesData.length === 1;
			return {
				name: entry.hunter.name,
				color: single ? (metric === 'all' ? EXERCISE_COLORS.pushups : EXERCISE_COLORS[metric]) : style.color,
				dashed: !single && style.dashed,
				points: series(entry.days, metric, view)
			};
		});
		return { stacked: false, list };
	});

	const option = $derived(chartOption({ series: chart.list, view, stacked: chart.stacked }));
	const title = $derived(
		`${METRIC_LABELS[metric]} ${view === 'day' ? 'pro Tag' : view === 'week' ? 'pro Woche' : 'kumuliert'}`
	);
</script>

<svelte:head><title>Statistik · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Statistik</h1>

	<Panel>
		<div class="filters">
			<div class="filter">
				<span class="label">Zeitraum</span>
				<Segmented
					label="Zeitraum"
					bind:value={preset}
					options={[
						{ value: '7', label: '7 Tage' },
						{ value: '30', label: '30 Tage' },
						{ value: 'all', label: 'Gesamt' },
						{ value: 'custom', label: 'Eigener' }
					]}
				/>
				{#if preset === 'custom'}
					<div class="dates">
						<label class="field"><span>Von</span><input class="input" id="stats-from" type="date" min="2026-10-09" max={data.today} bind:value={customFrom} /></label>
						<label class="field"><span>Bis</span><input class="input" id="stats-to" type="date" min="2026-10-09" max={data.today} bind:value={customTo} /></label>
					</div>
				{/if}
			</div>
			<div class="filter">
				<span class="label">Personen</span>
				<div class="people">
					{#each data.hunters as hunter (hunter.id)}
						<button
							type="button"
							class="person"
							class:on={activeSelection.includes(hunter.id)}
							aria-pressed={activeSelection.includes(hunter.id)}
							onclick={() => toggle(hunter.id)}
						>
							<span class="dot" style:background={hunter.color}></span>{hunter.name}
						</button>
					{/each}
				</div>
			</div>
			<div class="filter">
				<span class="label">Kennzahl</span>
				<Segmented
					label="Kennzahl"
					bind:value={metric}
					options={[
						{ value: 'all', label: 'Alle' },
						{ value: 'pushups', label: 'Liegest.' },
						{ value: 'squats', label: 'Kniebeugen' },
						{ value: 'situps', label: 'Sit-ups' },
						{ value: 'bonus', label: 'Bonus' }
					]}
				/>
			</div>
			<div class="filter">
				<span class="label">Ansicht</span>
				<Segmented
					label="Ansicht"
					bind:value={view}
					options={[
						{ value: 'day', label: 'Tag' },
						{ value: 'week', label: 'Woche' },
						{ value: 'cumulative', label: 'Kumuliert' }
					]}
				/>
			</div>
		</div>
		<p class="range">{dayLabel(range.from)} bis {dayLabel(range.to)}{loading ? ' · lädt …' : ''}</p>
		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
	</Panel>

	<div class="kpis">
		{#each seriesData as entry (entry.hunter.id)}
			{@const k = kpis(entry.days)}
			<Panel title={seriesData.length > 1 ? entry.hunter.name : 'Kennzahlen'}>
				<dl class="tiles">
					<div><dt>Liegestütze</dt><dd class="num">{count(k.totals.pushups)}</dd></div>
					<div><dt>Kniebeugen</dt><dd class="num">{count(k.totals.squats)}</dd></div>
					<div><dt>Sit-ups</dt><dd class="num">{count(k.totals.situps)}</dd></div>
					<div><dt>Ø Wdh. pro Tag</dt><dd class="num">{count(k.average)}</dd></div>
					<div><dt>Bester Tag</dt><dd class="num">{k.best ? count(k.best.value) : '–'}</dd>{#if k.best}<span class="hint">{dayLabel(k.best.date)}</span>{/if}</div>
					<div><dt>Bonuspunkte</dt><dd class="num">{points(k.bonus)}</dd></div>
					<div><dt>Erfüllt</dt><dd class="num ok">{k.fulfilled}</dd></div>
					<div><dt>Krank</dt><dd class="num">{k.sick}</dd></div>
					<div><dt>Verpasst</dt><dd class="num warn">{k.missed}</dd></div>
				</dl>
			</Panel>
		{/each}
	</div>

	<Panel title={title}>
		<Chart {option} label="{title}, {dayLabel(range.from)} bis {dayLabel(range.to)}" />
		<details class="table">
			<summary>Als Tabelle anzeigen</summary>
			<div class="scroll">
				<table>
					<thead>
						<tr>
							<th scope="col">{view === 'week' ? 'Woche' : 'Tag'}</th>
							{#each chart.list as entry (entry.name)}<th scope="col">{entry.name}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each chart.list[0]?.points ?? [] as point, index (point.key)}
							<tr>
								<th scope="row">{point.label}</th>
								{#each chart.list as entry (entry.name)}<td class="num">{points(entry.points[index]?.value ?? 0)}</td>{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</details>
	</Panel>

	{#if seriesData.length === 1}
		<Panel title="Kalender">
			<DayGrid days={seriesData[0].days.map((day) => ({ date: day.date, status: day.status }))} />
		</Panel>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	.filters {
		display: grid;
		gap: 14px;
	}

	.filter {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.label {
		font-size: 12px;
		color: var(--dim);
	}

	.dates {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.people {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.person {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 36px;
		padding: 4px 12px;
		border: 1px solid var(--line-faint);
		background: none;
		color: var(--dim);
		cursor: pointer;
	}

	.person.on {
		border-color: var(--line);
		color: var(--text);
		background: rgba(164, 124, 255, 0.14);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.range {
		margin-top: 12px;
		font-size: 13px;
		color: var(--muted);
	}

	.kpis {
		display: grid;
		gap: 16px;
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin: 0;
	}

	dt {
		font-size: 12px;
		color: var(--dim);
	}

	dd {
		margin: 2px 0 0;
		font-size: 20px;
		font-weight: 700;
	}

	dd.ok {
		color: var(--ok);
	}

	dd.warn {
		color: var(--warn);
	}

	.table {
		margin-top: 10px;
		font-size: 14px;
	}

	summary {
		cursor: pointer;
		color: var(--dim);
	}

	.scroll {
		overflow-x: auto;
		margin-top: 8px;
	}

	table {
		border-collapse: collapse;
		min-width: 100%;
	}

	th,
	td {
		padding: 6px 10px;
		border-bottom: 1px solid var(--line-faint);
		text-align: right;
		white-space: nowrap;
	}

	th:first-child {
		text-align: left;
	}

	@media (min-width: 1024px) {
		.filters {
			grid-template-columns: repeat(4, minmax(0, auto));
			align-items: start;
		}

		.kpis {
			grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		}

		.tiles {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
