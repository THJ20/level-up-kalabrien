<script lang="ts">
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import Segmented from '../Segmented.svelte';

	let { onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void } = $props();

	let name = $state('');
	let kind = $state<'time' | 'reps'>('time');
	let secondsPerRep = $state<number | null>(3);
	let tracksDistance = $state(false);
	let isRunning = $state(false);
	let error = $state('');
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			const { exercise } = await apiFetch<{ exercise: { id: string } }>('/api/exercises', {
				body: {
					name,
					kind,
					secondsPerRep: kind === 'reps' ? secondsPerRep : null,
					tracksDistance: kind === 'time' && tracksDistance,
					isRunning: kind === 'time' && tracksDistance && isRunning
				}
			});
			await refresh();
			onCreated(exercise.id);
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<form class="form" onsubmit={submit}>
	<p class="sys title">Neue Übung</p>
	<label class="field">
		<span>Name</span>
		<input class="input" id="exercise-name" bind:value={name} maxlength="40" required />
	</label>
	<div class="field">
		<span>Gezählt wird nach</span>
		<Segmented
			label="Eingabeart"
			bind:value={kind}
			options={[
				{ value: 'time', label: 'Minuten' },
				{ value: 'reps', label: 'Wiederholungen' }
			]}
		/>
	</div>
	{#if kind === 'reps'}
		<label class="field">
			<span>Sekunden pro Wiederholung (2 bis 10)</span>
			<input class="input num" id="seconds-per-rep" type="number" min="2" max="10" bind:value={secondsPerRep} required />
			<span class="hint">Grob geschätzt inklusive kurzer Pausen. Klimmzüge sind z. B. 4 Sekunden.</span>
		</label>
	{:else}
		<label class="check">
			<input type="checkbox" bind:checked={tracksDistance} /> Strecke in km erfassen
		</label>
		{#if tracksDistance}
			<label class="check">
				<input type="checkbox" bind:checked={isRunning} /> Zählt als Laufen (für den Monatsmarathon)
			</label>
		{/if}
	{/if}
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
	<div class="actions">
		<button class="btn btn-primary" type="submit" disabled={busy}>Übung anlegen</button>
		<button class="btn btn-ghost" type="button" onclick={onCancel}>Abbrechen</button>
	</div>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--line-faint);
		background: rgba(var(--accent-rgb), 0.04);
	}

	.title {
		font-size: 12px;
		color: var(--dim);
	}

	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
	}

	.check input {
		width: 18px;
		height: 18px;
		accent-color: var(--line);
	}

	.actions {
		display: flex;
		gap: 8px;
	}
</style>
