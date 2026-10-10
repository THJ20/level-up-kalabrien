<script lang="ts">
	import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from '@lucide/svelte';
	import { MAX_PLAN_ITEMS, TARGET_LIMITS, UNIT_LABELS, unitsFor, type PlanUnit } from '#lib/domain/index.ts';
	import ExerciseForm from '../quest/ExerciseForm.svelte';
	import Sheet from '../Sheet.svelte';
	import { defaultTarget, rowFromExercise, targetHint, unitsOfRow, type CatalogExercise, type DraftRow } from './draft';

	let { rows = $bindable(), exercises }: { rows: DraftRow[]; exercises: CatalogExercise[] } = $props();

	let adding = $state(false);
	let creating = $state(false);
	let pickId = $state('');
	let pickUnit = $state<PlanUnit>('reps');
	let pickTarget = $state<number | null>(null);

	const available = $derived(exercises.filter((exercise) => !rows.some((row) => row.exerciseId === exercise.id)));
	const picked = $derived(exercises.find((exercise) => exercise.id === pickId));
	const pickUnits = $derived(picked ? unitsFor(picked) : (['reps'] as PlanUnit[]));

	$effect(() => {
		if (picked && !pickUnits.includes(pickUnit)) pickUnit = pickUnits[0];
	});

	function move(index: number, delta: number) {
		const next = [...rows];
		const [row] = next.splice(index, 1);
		next.splice(index + delta, 0, row);
		rows = next;
	}

	function remove(index: number) {
		rows = rows.filter((_, position) => position !== index);
	}

	function openAdd() {
		pickId = '';
		pickTarget = null;
		creating = false;
		adding = true;
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		if (!picked) return;
		rows = [...rows, rowFromExercise(picked, pickUnit, pickTarget && pickTarget > 0 ? pickTarget : defaultTarget(pickUnit))];
		adding = false;
	}
</script>

{#if rows.length === 0}
	<p class="empty">Noch keine Übung im Plan. Füg unten eine hinzu oder importiere deinen Plan.</p>
{:else}
	<ol class="rows">
		{#each rows as row, index (row.key)}
			{@const units = unitsOfRow(row, exercises)}
			<li>
				<div class="title">
					<span class="name">{row.name}</span>
					{#if row.newExercise}<span class="new"><Sparkles size={13} /> neu</span>{/if}
				</div>
				<div class="controls">
					<label class="target">
						<span class="visually-hidden">Ziel für {row.name}</span>
						<input
							class="input num"
							type="number"
							inputmode={row.unit === 'km' ? 'decimal' : 'numeric'}
							min={TARGET_LIMITS[row.unit].min}
							max={TARGET_LIMITS[row.unit].max}
							step={row.unit === 'km' ? 0.1 : 1}
							bind:value={row.target}
							title={targetHint(row.unit)}
						/>
					</label>
					{#if units.length > 1}
						<select class="input unit" aria-label="Einheit für {row.name}" bind:value={row.unit}>
							{#each units as unit (unit)}<option value={unit}>{UNIT_LABELS[unit].short}</option>{/each}
						</select>
					{:else}
						<span class="unit-label">{UNIT_LABELS[row.unit].short}</span>
					{/if}
					<span class="tools">
						<button class="icon-btn" type="button" aria-label="{row.name} nach oben" disabled={index === 0} onclick={() => move(index, -1)}>
							<ArrowUp size={16} />
						</button>
						<button
							class="icon-btn"
							type="button"
							aria-label="{row.name} nach unten"
							disabled={index === rows.length - 1}
							onclick={() => move(index, 1)}
						>
							<ArrowDown size={16} />
						</button>
						<button class="icon-btn danger" type="button" aria-label="{row.name} entfernen" onclick={() => remove(index)}>
							<Trash2 size={16} />
						</button>
					</span>
				</div>
			</li>
		{/each}
	</ol>
{/if}

<button class="btn add" type="button" disabled={rows.length >= MAX_PLAN_ITEMS} onclick={openAdd}>
	<Plus size={18} /> Übung hinzufügen
</button>

<Sheet bind:open={adding} title="Übung zum Plan hinzufügen">
	{#if creating}
		<ExerciseForm
			onCreated={(id) => {
				pickId = id;
				creating = false;
			}}
			onCancel={() => (creating = false)}
		/>
	{:else}
		<form class="form" onsubmit={add}>
			<label class="field">
				<span>Übung</span>
				<select class="input" id="plan-exercise" bind:value={pickId} required>
					<option value="" disabled>Übung wählen</option>
					{#each available as item (item.id)}
						<option value={item.id}>{item.name}</option>
					{/each}
				</select>
			</label>
			<button class="link" type="button" onclick={() => (creating = true)}>Übung fehlt? Neue Übung anlegen</button>
			{#if picked}
				<div class="pair">
					<label class="field">
						<span>Tagesziel</span>
						<input
							class="input num"
							id="plan-target"
							type="number"
							inputmode={pickUnit === 'km' ? 'decimal' : 'numeric'}
							min={TARGET_LIMITS[pickUnit].min}
							max={TARGET_LIMITS[pickUnit].max}
							step={pickUnit === 'km' ? 0.1 : 1}
							placeholder={String(defaultTarget(pickUnit))}
							bind:value={pickTarget}
						/>
					</label>
					<label class="field">
						<span>Einheit</span>
						<select class="input" id="plan-unit" bind:value={pickUnit} disabled={pickUnits.length === 1}>
							{#each pickUnits as unit (unit)}<option value={unit}>{UNIT_LABELS[unit].long}</option>{/each}
						</select>
					</label>
				</div>
			{/if}
			<button class="btn btn-primary btn-block" type="submit" disabled={!picked}>Hinzufügen</button>
		</form>
	{/if}
</Sheet>

<style>
	.empty {
		color: var(--muted);
		font-size: 14px;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		counter-reset: plan;
	}

	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 12px;
		padding: 10px 0;
		border-top: 1px solid var(--line-faint);
	}

	li:first-child {
		border-top: none;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		flex: 1 1 160px;
	}

	.name {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.new {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 6px;
		border: 1px solid var(--gold);
		color: var(--gold);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.target .input {
		width: 86px;
		min-height: 40px;
		padding: 6px 8px;
	}

	.unit {
		width: auto;
		min-height: 40px;
		padding: 6px 8px;
	}

	.unit-label {
		min-width: 40px;
		color: var(--dim);
		font-size: 14px;
	}

	.tools {
		display: flex;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	.icon-btn:hover:not(:disabled) {
		color: var(--text);
	}

	.icon-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.icon-btn.danger:hover {
		color: var(--warn);
	}

	.add {
		margin-top: 12px;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
	}

	.link {
		align-self: flex-start;
		padding: 0;
		border: none;
		background: none;
		color: var(--accent-text);
		text-decoration: underline;
		font-size: 14px;
		cursor: pointer;
	}
</style>
