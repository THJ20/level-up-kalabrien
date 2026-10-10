<script lang="ts">
	import { untrack } from 'svelte';
	import { CalendarClock } from '@lucide/svelte';
	import { WARMUP_START, type PlanItem } from '#lib/domain/index.ts';
	import * as actions from '#lib/client/actions.ts';
	import { errorMessage } from '#lib/client/api.ts';
	import { amount, dayLabel } from '#lib/client/format.ts';
	import Panel from '#lib/ui/Panel.svelte';
	import PlanEditor from '#lib/ui/plan/PlanEditor.svelte';
	import PlanImport from '#lib/ui/plan/PlanImport.svelte';
	import { draftError, rowsFromPlan, toPayload, type DraftRow } from '#lib/ui/plan/draft.ts';

	let { data } = $props();

	let rows = $state<DraftRow[]>([]);
	/** Signatur des zuletzt geladenen Plans, um Änderungen im Editor zu erkennen. */
	let seen = $state<string | null>(null);
	let busy = $state(false);
	let error = $state('');
	let savedFor = $state<string | null>(null);

	const basis = $derived<readonly PlanItem[]>(data.plan.upcoming?.items ?? data.plan.current);
	const retroactive = $derived(data.plan.nextStart === WARMUP_START);
	const validation = $derived(rows.length > 0 ? draftError(rows) : 'Ein Plan braucht mindestens eine Übung.');

	const signature = (list: readonly DraftRow[]) =>
		JSON.stringify(list.map((row) => [row.exerciseId, row.newExercise?.name ?? null, row.unit, Number(row.target)]));
	const dirty = $derived(seen !== null && signature(rows) !== seen);

	// Editor mit dem neuesten gespeicherten Plan füllen, solange dort nichts geändert wurde.
	$effect(() => {
		const items = basis;
		untrack(() => {
			const fresh = rowsFromPlan(items);
			if (seen === null || signature(rows) === seen) rows = fresh;
			seen = signature(fresh);
		});
	});

	function edit(next: DraftRow[]) {
		rows = next;
		savedFor = null;
	}

	async function save() {
		if (validation) {
			error = validation;
			return;
		}
		busy = true;
		error = '';
		try {
			await actions.savePlan(toPayload(rows));
			savedFor = data.plan.nextStart;
			await actions.refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	function reset() {
		error = '';
		rows = rowsFromPlan(basis);
	}
</script>

<svelte:head><title>Trainingsplan · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Trainingsplan</h1>
	<p class="intro">
		Dein Plan ist deine Daily Quest. Er gilt jeden Tag gleich. Alle anderen sehen ihn in deinem Statusfenster.
	</p>

	<div class="columns">
		<div class="stack">
			<Panel title="Gilt heute" aside={dayLabel(data.plan.today)}>
				<ul class="current">
					{#each data.plan.current as item (item.exerciseId)}
						<li><span>{item.name}</span><b class="num">{amount(item.target, item.unit)}</b></li>
					{/each}
				</ul>
				{#if data.plan.upcoming}
					<p class="upcoming">
						<CalendarClock size={16} />
						Ab {dayLabel(data.plan.upcoming.validFrom)} gilt dein neuer Plan mit
						{data.plan.upcoming.items.length}
						{data.plan.upcoming.items.length === 1 ? 'Übung' : 'Übungen'}.
					</p>
				{/if}
			</Panel>

			<Panel title="Plan bearbeiten">
				<PlanEditor bind:rows exercises={data.exercises} />
				<div class="save">
					<p class="when">
						{#if retroactive}
							Du hast noch nichts eingetragen. Dein Plan gilt deshalb sofort, auch für alle Tage seit dem 09.10.
						{:else}
							Änderungen gelten ab {dayLabel(data.plan.nextStart)}. Die heutige Quest bleibt, wie sie ist.
						{/if}
					</p>
					{#if error}<p class="form-error" role="alert">{error}</p>{/if}
					{#if savedFor && !dirty && !busy}
						<p class="saved" role="status">Gespeichert. {savedFor === WARMUP_START ? 'Gilt ab sofort.' : `Gilt ab ${dayLabel(savedFor)}.`}</p>
					{/if}
					<div class="buttons">
						<button class="btn btn-primary" type="button" disabled={busy || !dirty} onclick={save}>Plan speichern</button>
						{#if dirty}<button class="btn btn-ghost" type="button" onclick={reset}>Änderungen verwerfen</button>{/if}
					</div>
				</div>
			</Panel>
		</div>

		<Panel title="Plan importieren">
			<PlanImport exercises={data.exercises} onApply={(imported) => edit(imported)} />
		</Panel>
	</div>
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

	.intro {
		color: var(--dim);
		max-width: 70ch;
	}

	.columns {
		display: grid;
		gap: 16px;
		align-items: start;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.current {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.current li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 0;
		border-top: 1px solid var(--line-faint);
	}

	.current li:first-child {
		border-top: none;
	}

	.upcoming {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		padding: 8px 10px;
		border-left: 3px solid var(--gold);
		background: rgba(245, 197, 66, 0.08);
		font-size: 14px;
	}

	.save {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--line-faint);
	}

	.when {
		font-size: 14px;
		color: var(--dim);
	}

	.saved {
		color: var(--ok);
		font-size: 14px;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	@media (min-width: 1024px) {
		.columns {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
</style>
