<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { WARMUP_START, addDays, type DayStatus, type LocalDate } from '#lib/domain/index.ts';
	import { dayLabel } from '#lib/client/format.ts';
	import DayGrid from '../DayGrid.svelte';
	import Sheet from '../Sheet.svelte';

	let {
		date,
		today,
		calendar
	}: { date: LocalDate; today: LocalDate; calendar: { date: LocalDate; status: DayStatus }[] } = $props();

	let open = $state(false);

	const previous = $derived(date > WARMUP_START ? addDays(date, -1) : null);
	const next = $derived(date < today ? addDays(date, 1) : null);
	const hrefFor = (target: LocalDate) => (target === today ? '/' : `/?date=${target}`);
</script>

<div class="daynav">
	{#if previous}
		<a class="arrow" href={hrefFor(previous)} aria-label="Vorheriger Tag" data-sveltekit-noscroll><ChevronLeft size={20} /></a>
	{:else}
		<span class="arrow disabled" aria-hidden="true"><ChevronLeft size={20} /></span>
	{/if}
	<button class="current" type="button" onclick={() => (open = true)} aria-label="Kalender öffnen">
		<CalendarDays size={16} />
		<span class="sys">{date === today ? 'Heute' : dayLabel(date)}</span>
	</button>
	{#if next}
		<a class="arrow" href={hrefFor(next)} aria-label="Nächster Tag" data-sveltekit-noscroll><ChevronRight size={20} /></a>
	{:else}
		<span class="arrow disabled" aria-hidden="true"><ChevronRight size={20} /></span>
	{/if}
</div>
{#if date !== today}
	<p class="backnote">
		Du siehst einen vergangenen Tag und kannst ihn nachtragen. <a href="/">Zurück zu heute</a>
	</p>
{/if}

<Sheet bind:open title="Tag wählen">
	<DayGrid days={calendar} selected={date} {hrefFor} />
</Sheet>

<style>
	.daynav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.arrow {
		display: grid;
		place-items: center;
		width: 44px;
		height: 40px;
		border: 1px solid var(--line-faint);
		color: var(--text);
	}

	.arrow.disabled {
		color: var(--unscored);
	}

	.current {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 40px;
		border: 1px solid var(--line-faint);
		background: rgba(var(--accent-rgb), 0.05);
		cursor: pointer;
		font-size: 14px;
	}

	.backnote {
		margin-top: 8px;
		padding: 8px 10px;
		border-left: 3px solid var(--gold);
		background: rgba(245, 197, 66, 0.08);
		font-size: 14px;
		color: var(--dim);
	}
</style>
