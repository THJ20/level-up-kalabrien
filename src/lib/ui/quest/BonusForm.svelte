<script lang="ts">
	import {
		EFFORTS,
		EFFORT_FACTOR,
		repsBonusPoints,
		timeBonusPoints,
		type Effort,
		type LocalDate
	} from '#lib/domain/index.ts';
	import * as actions from '#lib/client/actions.ts';
	import { errorMessage } from '#lib/client/api.ts';
	import { EFFORT_INFO } from '#lib/client/effort.ts';
	import { points } from '#lib/client/format.ts';
	import ExerciseForm from './ExerciseForm.svelte';

	interface CatalogExercise {
		id: string;
		name: string;
		kind: 'time' | 'reps';
		secondsPerRep: number | null;
		tracksDistance: boolean;
	}

	let {
		exercises,
		date,
		onDone
	}: { exercises: CatalogExercise[]; date: LocalDate; onDone: () => void } = $props();

	let exerciseId = $state('');
	let minutes = $state<number | null>(null);
	let reps = $state<number | null>(null);
	let effort = $state<Effort>('moderate');
	let distanceKm = $state<number | null>(null);
	let creating = $state(false);
	let error = $state('');
	let busy = $state(false);

	const exercise = $derived(exercises.find((item) => item.id === exerciseId));
	const preview = $derived.by(() => {
		if (!exercise) return null;
		if (exercise.kind === 'time') return minutes && minutes > 0 ? timeBonusPoints(minutes, effort) : null;
		return reps && reps > 0 && exercise.secondsPerRep ? repsBonusPoints(reps, exercise.secondsPerRep, effort) : null;
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!exercise) {
			error = 'Wähl zuerst eine Übung.';
			return;
		}
		error = '';
		busy = true;
		try {
			await actions.addBonus({
				exerciseId: exercise.id,
				date,
				minutes: exercise.kind === 'time' ? minutes : null,
				reps: exercise.kind === 'reps' ? reps : null,
				effort,
				distanceKm: exercise.tracksDistance && distanceKm ? distanceKm : null
			});
			await actions.refresh();
			onDone();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

{#if creating}
	<ExerciseForm
		onCreated={(id) => {
			exerciseId = id;
			creating = false;
		}}
		onCancel={() => (creating = false)}
	/>
{:else}
	<form class="form" onsubmit={submit}>
		<label class="field">
			<span>Übung</span>
			<select class="input" id="bonus-exercise" bind:value={exerciseId} required>
				<option value="" disabled>Übung wählen</option>
				{#each exercises as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</label>
		<button class="link" type="button" onclick={() => (creating = true)}>Übung fehlt? Neue Übung anlegen</button>

		{#if exercise}
			<div class="pair">
				{#if exercise.kind === 'time'}
					<label class="field">
						<span>Minuten</span>
						<input class="input num" id="bonus-minutes" type="number" inputmode="numeric" min="1" max="600" bind:value={minutes} required />
					</label>
				{:else}
					<label class="field">
						<span>Wiederholungen</span>
						<input class="input num" id="bonus-reps" type="number" inputmode="numeric" min="1" max="1000" bind:value={reps} required />
					</label>
				{/if}
				{#if exercise.tracksDistance}
					<label class="field">
						<span>Strecke in km (optional)</span>
						<input class="input num" id="bonus-distance" type="number" inputmode="decimal" min="0.1" max="500" step="0.1" bind:value={distanceKm} />
					</label>
				{/if}
			</div>

			<fieldset class="efforts">
				<legend>Wie hart war es?</legend>
				{#each EFFORTS as level (level)}
					<label class="effort" class:active={effort === level}>
						<input type="radio" name="effort" value={level} bind:group={effort} />
						<span class="head"><b class="sys">{EFFORT_INFO[level].label}</b><span class="num">×{EFFORT_FACTOR[level]}</span></span>
						<span class="desc">{EFFORT_INFO[level].endurance}. Kraft: {EFFORT_INFO[level].strength}.</span>
					</label>
				{/each}
			</fieldset>

			<p class="preview">
				{#if preview !== null}
					<span class="num">+{points(preview)}</span> BP
				{:else}
					BP-Vorschau erscheint, sobald alles ausgefüllt ist.
				{/if}
			</p>
		{/if}

		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<button class="btn btn-primary btn-block" type="submit" disabled={busy || !exercise}>Eintragen</button>
	</form>
{/if}

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
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

	.pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
	}

	.efforts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 8px;
		margin: 0;
		padding: 0;
		border: none;
	}

	legend {
		margin-bottom: 6px;
		font-size: 13px;
		color: var(--dim);
	}

	.effort {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px;
		border: 1px solid var(--line-faint);
		background: rgba(164, 124, 255, 0.04);
		cursor: pointer;
	}

	.effort input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.effort.active {
		border-color: var(--line);
		background: rgba(164, 124, 255, 0.14);
		box-shadow: 0 0 12px var(--glow-soft);
	}

	.effort:has(input:focus-visible) {
		outline: 2px solid var(--line);
	}

	.head {
		display: flex;
		justify-content: space-between;
		font-size: 14px;
	}

	.desc {
		font-size: 13px;
		color: var(--dim);
	}

	.preview {
		text-align: center;
		color: var(--dim);
	}

	.preview .num {
		font-size: 28px;
		font-weight: 700;
		color: var(--accent-text);
		text-shadow: 0 0 14px var(--glow);
	}
</style>
