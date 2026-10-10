<script lang="ts">
	import { CircleCheck, Plus } from '@lucide/svelte';
	import { EXERCISE_LABELS, QUEST_TARGET, type Exercise } from '#lib/domain/index.ts';
	import ProgressBar from '../ProgressBar.svelte';

	let {
		exercise,
		total,
		onAdd
	}: { exercise: Exercise; total: number; onAdd: (reps: number) => void } = $props();

	let customOpen = $state(false);
	let customValue = $state<number | null>(null);
	let customInput: HTMLInputElement | undefined = $state();

	const done = $derived(total >= QUEST_TARGET);
	const missing = $derived(Math.max(0, QUEST_TARGET - total));

	$effect(() => {
		if (customOpen) customInput?.focus();
	});

	function submitCustom(event: SubmitEvent) {
		event.preventDefault();
		if (!customValue || customValue < 1) return;
		onAdd(Math.min(500, Math.round(customValue)));
		customValue = null;
		customOpen = false;
	}
</script>

<div class="row" class:done>
	<div class="head">
		<span class="label sys">
			{EXERCISE_LABELS[exercise]}
			{#if done}<CircleCheck size={17} />{/if}
		</span>
		<span class="count num">[<b>{total}</b>/{QUEST_TARGET}]</span>
	</div>
	<ProgressBar value={total / QUEST_TARGET} tone={done ? 'ok' : 'accent'} label="{EXERCISE_LABELS[exercise]} Fortschritt" />
	<div class="buttons">
		{#each [10, 20, 25] as reps (reps)}
			<button type="button" class="quick num" onclick={() => onAdd(reps)}>+{reps}</button>
		{/each}
		{#if !done && missing > 0 && missing !== 10 && missing !== 20 && missing !== 25}
			<button type="button" class="quick rest num" onclick={() => onAdd(missing)} title="Rest bis 100 eintragen">
				+{missing}
			</button>
		{/if}
		<button
			type="button"
			class="quick custom"
			aria-label="Eigene Zahl eintragen"
			aria-expanded={customOpen}
			onclick={() => (customOpen = !customOpen)}
		>
			<Plus size={18} />
		</button>
	</div>
	{#if customOpen}
		<form class="customform" onsubmit={submitCustom}>
			<input
				class="input num"
				type="number"
				inputmode="numeric"
				min="1"
				max="500"
				placeholder="Wiederholungen"
				aria-label="Wiederholungen für {EXERCISE_LABELS[exercise]}"
				bind:value={customValue}
				bind:this={customInput}
			/>
			<button class="btn btn-primary" type="submit">Eintragen</button>
		</form>
	{/if}
</div>

<style>
	.row {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 15px;
		letter-spacing: 0.1em;
	}

	.label :global(svg) {
		color: var(--ok);
	}

	.count {
		font-size: 15px;
		font-weight: 600;
		color: var(--dim);
	}

	.count b {
		color: var(--text);
	}

	.done .count b {
		color: var(--ok);
	}

	.buttons {
		display: flex;
		gap: 6px;
	}

	.quick {
		flex: 1;
		min-height: 40px;
		border: 1px solid var(--line-dim);
		background: rgba(164, 124, 255, 0.07);
		color: var(--text);
		font-weight: 600;
		font-size: 15px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.08s,
			background 0.15s;
	}

	.quick:hover {
		border-color: var(--line);
	}

	.quick:active {
		transform: scale(0.95);
		background: rgba(164, 124, 255, 0.22);
	}

	.rest {
		border-color: rgba(126, 240, 208, 0.45);
		color: var(--ok);
	}

	.custom {
		flex: 0 0 44px;
		display: grid;
		place-items: center;
		color: var(--dim);
	}

	.customform {
		display: flex;
		gap: 8px;
	}

	.customform .input {
		flex: 1;
	}
</style>
