<script lang="ts">
	import { CircleCheck, Plus } from '@lucide/svelte';
	import { SET_LIMITS, UNIT_LABELS, roundToUnit, type PlanItem } from '#lib/domain/index.ts';
	import { decimal } from '#lib/client/format.ts';
	import ProgressBar from '../ProgressBar.svelte';

	let { item, total, onAdd }: { item: PlanItem; total: number; onAdd: (value: number) => void } = $props();

	let customOpen = $state(false);
	let customValue = $state<number | null>(null);
	let customInput: HTMLInputElement | undefined = $state();

	const done = $derived(total + 1e-9 >= item.target);
	const missing = $derived(Math.max(0, roundToUnit(item.unit, item.target - total)));
	const limits = $derived(SET_LIMITS[item.unit]);
	const step = $derived(item.unit === 'km' ? 0.1 : 1);

	/** Schnelltasten passend zu Einheit und Tagesziel. */
	const quick = $derived.by(() => {
		if (item.unit === 'km') return [0.5, 1, 2];
		if (item.unit === 'minutes') return item.target >= 20 ? [5, 10, 15] : [1, 2, 5];
		if (item.target >= 60) return [10, 20, 25];
		if (item.target >= 20) return [5, 10, 15];
		return [1, 2, 5];
	});

	$effect(() => {
		if (customOpen) customInput?.focus();
	});

	function submitCustom(event: SubmitEvent) {
		event.preventDefault();
		if (!customValue || customValue <= 0) return;
		onAdd(Math.min(limits.max, roundToUnit(item.unit, customValue)));
		customValue = null;
		customOpen = false;
	}
</script>

<div class="row" class:done>
	<div class="head">
		<span class="label sys">
			{item.name}
			{#if done}<CircleCheck size={17} />{/if}
		</span>
		<span class="count num">[<b>{decimal(total)}</b>/{decimal(item.target)}]{item.unit === 'reps' ? '' : ` ${UNIT_LABELS[item.unit].short}`}</span>
	</div>
	<ProgressBar value={total / item.target} tone={done ? 'ok' : 'accent'} label="{item.name} Fortschritt" />
	<div class="buttons">
		{#each quick as value (value)}
			<button type="button" class="quick num" onclick={() => onAdd(value)}>+{decimal(value)}</button>
		{/each}
		{#if !done && missing > 0 && !quick.includes(missing) && missing <= limits.max}
			<button type="button" class="quick rest num" onclick={() => onAdd(missing)} title="Rest bis zum Ziel eintragen">
				+{decimal(missing)}
			</button>
		{/if}
		<button
			type="button"
			class="quick custom"
			aria-label="Eigenen Wert eintragen"
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
				inputmode={item.unit === 'km' ? 'decimal' : 'numeric'}
				min={limits.min}
				max={limits.max}
				{step}
				placeholder={UNIT_LABELS[item.unit].long}
				aria-label="{UNIT_LABELS[item.unit].long} für {item.name}"
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
		gap: 10px;
	}

	.label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		font-size: 15px;
		letter-spacing: 0.1em;
		overflow-wrap: anywhere;
	}

	.label :global(svg) {
		flex: none;
		color: var(--ok);
	}

	.count {
		flex: none;
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
		background: rgba(var(--accent-rgb), 0.07);
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
		background: rgba(var(--accent-rgb), 0.22);
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
