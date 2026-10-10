<script lang="ts">
	import type { DayStatus, LocalDate } from '#lib/domain/index.ts';

	interface Day {
		date: LocalDate;
		status: DayStatus;
	}

	let {
		days,
		selected,
		hrefFor
	}: { days: Day[]; selected?: LocalDate; hrefFor?: (date: LocalDate) => string } = $props();

	const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

	const months = $derived.by(() => {
		const groups = new Map<string, Day[]>();
		for (const day of days) {
			const key = day.date.slice(0, 7);
			groups.set(key, [...(groups.get(key) ?? []), day]);
		}
		return [...groups.entries()].map(([key, list]) => {
			const [year, month] = key.split('-').map(Number);
			const first = new Date(Date.UTC(year, month - 1, Number(list[0].date.slice(8, 10))));
			const offset = (first.getUTCDay() + 6) % 7;
			return { key, title: `${MONTHS[month - 1]} ${year}`, offset, list };
		});
	});

	const STATUS_LABEL: Record<DayStatus, string> = {
		fulfilled: 'erfüllt',
		sick: 'krank',
		open: 'offen',
		unscored: 'ohne Wertung',
		missed: 'verpasst',
		warmup: 'Aufwärmtag, zählt nicht'
	};

	const hasWarmup = $derived(days.some((day) => day.status === 'warmup'));
</script>

<div class="grid-wrap">
	{#each months as month (month.key)}
		<section>
			<h3 class="sys">{month.title}</h3>
			<div class="weekdays" aria-hidden="true">
				{#each ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as weekday (weekday)}<span>{weekday}</span>{/each}
			</div>
			<div class="days">
				{#each { length: month.offset } as _, index (index)}<span class="pad"></span>{/each}
				{#each month.list as day (day.date)}
					{@const label = `${Number(day.date.slice(8, 10))}. ${month.title}: ${STATUS_LABEL[day.status]}`}
					{#if hrefFor}
						<a
							class="day s-{day.status}"
							class:selected={selected === day.date}
							href={hrefFor(day.date)}
							aria-label={label}
							data-sveltekit-noscroll
						>
							{Number(day.date.slice(8, 10))}
						</a>
					{:else}
						<span class="day s-{day.status}" title={label} aria-label={label}>{Number(day.date.slice(8, 10))}</span>
					{/if}
				{/each}
			</div>
		</section>
	{/each}
	<p class="legend">
		<span><i class="s-fulfilled"></i>erfüllt</span>
		<span><i class="s-sick"></i>krank</span>
		<span><i class="s-missed"></i>verpasst</span>
		<span><i class="s-open"></i>offen</span>
		<span><i class="s-unscored"></i>ohne Wertung</span>
		{#if hasWarmup}<span><i class="s-warmup"></i>Aufwärmtag</span>{/if}
	</p>
</div>

<style>
	.grid-wrap {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h3 {
		font-size: 12px;
		color: var(--dim);
		margin-bottom: 6px;
	}

	.weekdays,
	.days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 4px;
	}

	.weekdays span {
		text-align: center;
		font-size: 11px;
		color: var(--muted);
	}

	.day {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		max-height: 44px;
		font-family: var(--f-sys);
		font-size: 12px;
		color: var(--text);
		text-decoration: none;
		border: 1px solid transparent;
	}

	.s-fulfilled {
		background: rgba(126, 240, 208, 0.28);
		border-color: rgba(126, 240, 208, 0.6);
	}

	.s-sick {
		background: var(--sick-soft);
		border-color: rgba(154, 148, 173, 0.5);
	}

	.s-missed {
		background: rgba(255, 79, 123, 0.25);
		border-color: rgba(255, 79, 123, 0.6);
	}

	.s-open {
		background: rgba(var(--accent-rgb), 0.12);
		border-color: var(--line);
	}

	.s-unscored {
		background: var(--unscored);
		color: var(--muted);
	}

	.s-warmup {
		border: 1px dashed var(--line-dim);
		color: var(--dim);
	}

	.selected {
		outline: 2px solid var(--text);
		outline-offset: 1px;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		font-size: 12px;
		color: var(--dim);
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}

	.legend i {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 1px solid transparent;
	}

	.legend i.s-warmup {
		border: 1px dashed var(--line-dim);
	}
</style>
