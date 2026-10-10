<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import {
		EXERCISES,
		challengeDayNumber,
		emptyTotals,
		endOfDay,
		type DaySummary,
		type Exercise,
		type LocalDate
	} from '#lib/domain/index.ts';
	import * as actions from '#lib/client/actions.ts';
	import { errorMessage } from '#lib/client/api.ts';
	import { countdown, dayLabel } from '#lib/client/format.ts';
	import { offlineQueue } from '#lib/client/queue.svelte.ts';
	import Panel from '../Panel.svelte';
	import QuestRow from './QuestRow.svelte';
	import SetList from './SetList.svelte';

	interface SetEntry {
		id: string;
		exercise: Exercise;
		reps: number;
		recordedAt: Date;
	}

	let {
		date,
		isToday,
		day,
		sets
	}: { date: LocalDate; isToday: boolean; day: DaySummary | null; sets: SetEntry[] } = $props();

	let pending = $state(emptyTotals());
	let error = $state('');
	let showSets = $state(false);
	let confirmSick = $state(false);
	let busy = $state(false);
	let now = $state(Date.now());

	$effect(() => {
		if (!isToday) return;
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const totals = $derived(day?.totals ?? emptyTotals());
	const queuedSets = $derived(
		offlineQueue.entries.filter((entry) => entry.kind === 'set' && entry.body?.date === date)
	);
	const queued = $derived.by(() => {
		const sum = emptyTotals();
		for (const entry of queuedSets) sum[entry.body?.exercise as Exercise] += Number(entry.body?.reps ?? 0);
		return sum;
	});
	const status = $derived(day?.status ?? 'open');
	const timeLeft = $derived(countdown(endOfDay(date).getTime() - now));

	async function run(task: () => Promise<unknown>) {
		error = '';
		try {
			await task();
			await actions.refresh();
		} catch (caught) {
			error = errorMessage(caught);
		}
	}

	async function add(exercise: Exercise, reps: number) {
		pending[exercise] += reps;
		await run(() => actions.addSet(date, exercise, reps));
		pending[exercise] -= reps;
	}

	async function sick(report: boolean) {
		busy = true;
		await run(() => (report ? actions.reportSick(date) : actions.withdrawSick(date)));
		busy = false;
		confirmSick = false;
	}
</script>

<Panel tone={status === 'fulfilled' ? 'ok' : status === 'missed' ? 'warn' : status === 'sick' ? 'sick' : 'default'}>
	<div class="qhead">
		<span class="mark num">!</span>
		<span class="box sys">Daily Quest</span>
	</div>
	<p class="qtitle sys">Prepare for Calabria</p>
	<div class="meta sys">
		<span>Day {challengeDayNumber(date)} · Goals</span>
		{#if isToday}
			<span>Time left <b class="num">{timeLeft}</b></span>
		{:else}
			<span class="backfill">Nachtrag · {dayLabel(date)}</span>
		{/if}
	</div>

	<div class="rows">
		{#each EXERCISES as exercise (exercise)}
			<QuestRow
				{exercise}
				total={totals[exercise] + pending[exercise] + queued[exercise]}
				onAdd={(reps) => add(exercise, reps)}
			/>
		{/each}
	</div>

	{#if queuedSets.length > 0}
		<p class="queued">
			{queuedSets.length === 1 ? '1 Satz wartet' : `${queuedSets.length} Sätze warten`} auf Netz und wird automatisch gesendet.
		</p>
	{/if}
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}

	<div class="state">
		{#if status === 'fulfilled'}
			<p class="complete sys">Quest complete{day?.backfilled ? ' · nachgetragen' : ''}</p>
		{:else if status === 'sick'}
			<p class="sickline">Krank gemeldet{day?.backfilled ? ' (nachgetragen)' : ''}. Gute Besserung, Hunter.</p>
			<button class="btn btn-ghost btn-small" type="button" disabled={busy} onclick={() => sick(false)}>
				Krankmeldung zurücknehmen
			</button>
		{:else}
			<p class="warn">
				<b class="sys">Warning</b>
				{#if isToday}
					Failing the daily quest will be reported to all hunters and put to a penalty vote.
				{:else}
					Dieser Tag ist verpasst. Trag ihn nach oder melde dich krank, dann entfällt die Strafe.
				{/if}
			</p>
			{#if confirmSick}
				<div class="confirm">
					<p>Für {dayLabel(date)} krank melden? Der Tag bringt dann kein XP, aber auch keine Strafe.</p>
					<div class="confirm-actions">
						<button class="btn btn-danger btn-small" type="button" disabled={busy} onclick={() => sick(true)}>
							Krank melden
						</button>
						<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmSick = false)}>
							Abbrechen
						</button>
					</div>
				</div>
			{:else}
				<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmSick = true)}>
					Krank melden
				</button>
			{/if}
		{/if}
	</div>

	<button
		class="toggle"
		type="button"
		aria-expanded={showSets}
		onclick={() => (showSets = !showSets)}
	>
		Sätze an diesem Tag ({sets.length})
		<span class="chev" class:open={showSets}><ChevronDown size={16} /></span>
	</button>
	{#if showSets}
		<SetList
			{sets}
			onUpdate={(id, reps) => run(() => actions.updateSet(id, reps))}
			onDelete={(id) => run(() => actions.deleteSet(id))}
		/>
	{/if}
</Panel>

<style>
	.qhead {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 1px solid var(--line);
		font-weight: 700;
		box-shadow: 0 0 10px var(--glow-soft);
	}

	.box {
		padding: 2px 12px;
		border: 1px solid var(--line);
		font-size: 18px;
		letter-spacing: 0.22em;
		box-shadow: 0 0 10px var(--glow-soft);
	}

	.qtitle {
		margin-top: 10px;
		text-align: center;
		font-size: 13px;
		letter-spacing: 0.18em;
		color: var(--accent-text);
	}

	.meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin: 12px 0 10px;
		font-size: 12px;
		color: var(--dim);
		letter-spacing: 0.08em;
	}

	.meta b {
		color: var(--text);
	}

	.backfill {
		color: var(--gold);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.queued {
		margin-top: 12px;
		padding: 8px 10px;
		border-left: 3px solid var(--gold);
		background: rgba(245, 197, 66, 0.08);
		font-size: 14px;
		color: var(--dim);
	}

	.state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 8px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--line-faint);
	}

	.complete {
		width: 100%;
		text-align: center;
		color: var(--ok);
		font-size: 16px;
		letter-spacing: 0.24em;
		text-shadow: 0 0 14px rgba(126, 240, 208, 0.6);
	}

	.sickline {
		color: var(--sick);
	}

	.warn {
		font-size: 13px;
		color: var(--dim);
	}

	.warn b {
		color: var(--warn);
		margin-right: 4px;
	}

	.confirm {
		width: 100%;
		padding: 10px;
		border: 1px solid rgba(255, 79, 123, 0.4);
		background: var(--warn-soft);
		font-size: 14px;
	}

	.confirm-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		min-height: 40px;
		margin-top: 12px;
		padding: 0;
		border: none;
		background: none;
		color: var(--dim);
		font-size: 14px;
		cursor: pointer;
	}

	.chev {
		display: inline-flex;
		transition: transform 0.2s;
	}

	.chev.open {
		transform: rotate(180deg);
	}
</style>
