<script lang="ts">
	import { ArrowRight, Check } from '@lucide/svelte';
	import { WARMUP_START, type LocalDate, type PlanUnit } from '#lib/domain/index.ts';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { amount, dayLabel } from '#lib/client/format.ts';
	import Panel from '../Panel.svelte';

	interface Rotation {
		decision: 'accepted' | 'declined' | null;
		trained: { label: string }[];
		focus: { label: string }[];
		swaps: {
			replace: { name: string; unit: PlanUnit; target: number };
			with: { name: string; unit: PlanUnit; target: number; groups: string[] };
			group: string;
		}[];
		effectiveFrom: LocalDate;
	}

	let {
		rotation,
		title = 'Neue Muskelgruppen?'
	}: { rotation: Rotation; title?: string } = $props();

	let selected = $state<number[]>([]);
	let busy = $state(false);
	let error = $state('');

	$effect(() => {
		selected = rotation.swaps.map((_, index) => index);
	});

	const from = $derived(rotation.effectiveFrom === WARMUP_START ? 'sofort' : `ab ${dayLabel(rotation.effectiveFrom)}`);

	function toggle(index: number) {
		selected = selected.includes(index) ? selected.filter((entry) => entry !== index) : [...selected, index];
	}

	async function decide(accept: number[]) {
		busy = true;
		error = '';
		try {
			await apiFetch('/api/plan/rotation', { body: { accept } });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<Panel {title}>
	{#if rotation.swaps.length === 0}
		<p class="intro">Dein Plan trainiert schon alle Muskelgruppen. Für neue Varianten nutze den KI-Prompt unten.</p>
	{:else}
		<p class="intro">
			Bisher trainierst du {rotation.trained.map((entry) => entry.label).join(', ')}. Zu kurz kommen
			<b>{rotation.focus.map((entry) => entry.label).join(' und ')}</b>. Willst du dafür Übungen tauschen? Alles andere
			bleibt.
		</p>
		<ul class="swaps">
			{#each rotation.swaps as swap, index (index)}
				<li>
					<label class:off={!selected.includes(index)}>
						<input type="checkbox" checked={selected.includes(index)} disabled={busy} onchange={() => toggle(index)} />
						<span class="old">{swap.replace.name} <small>{amount(swap.replace.target, swap.replace.unit)}</small></span>
						<ArrowRight size={16} />
						<span class="new">
							{swap.with.name} <small>{amount(swap.with.target, swap.with.unit)}</small>
							<em>{swap.group}</em>
						</span>
					</label>
				</li>
			{/each}
		</ul>
		{#if rotation.decision === 'accepted'}
			<p class="done"><Check size={16} /> Übernommen. Weitere Tausche kannst du jederzeit machen.</p>
		{:else if rotation.decision === 'declined'}
			<p class="done"><Check size={16} /> Diese Woche behältst du deinen Plan.</p>
		{/if}
		<div class="buttons">
			<button class="btn btn-primary" type="button" disabled={busy || selected.length === 0} onclick={() => decide(selected)}>
				{selected.length === 1 ? 'Tausch übernehmen' : 'Tausche übernehmen'} ({from})
			</button>
			{#if rotation.decision === null}
				<button class="btn btn-ghost" type="button" disabled={busy} onclick={() => decide([])}>Nein, Plan behalten</button>
			{/if}
		</div>
	{/if}
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	.intro {
		font-size: 14px;
		color: var(--dim);
	}

	.intro b {
		color: var(--accent-text);
		font-weight: 600;
	}

	.swaps {
		list-style: none;
		margin: 12px 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px 10px;
		padding: 10px;
		border: 1px solid var(--line-dim);
		background: rgba(var(--accent-rgb), 0.06);
		cursor: pointer;
	}

	label.off {
		border-color: var(--line-faint);
		background: none;
		opacity: 0.7;
	}

	label :global(svg) {
		color: var(--line);
	}

	input {
		width: 18px;
		height: 18px;
		accent-color: var(--line);
	}

	.old {
		color: var(--dim);
		text-decoration: line-through;
		text-decoration-color: var(--muted);
	}

	.new {
		font-weight: 600;
	}

	small {
		font-weight: 400;
		color: var(--dim);
	}

	em {
		display: block;
		font-style: normal;
		font-weight: 400;
		font-size: 12px;
		color: var(--accent-text);
	}

	.done {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
		font-size: 14px;
		color: var(--ok);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
</style>
