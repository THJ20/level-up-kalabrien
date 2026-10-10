<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import type { Effort, LocalDate } from '#lib/domain/index.ts';
	import * as actions from '#lib/client/actions.ts';
	import { errorMessage } from '#lib/client/api.ts';
	import { effortLabel } from '#lib/client/effort.ts';
	import { points } from '#lib/client/format.ts';
	import Panel from '../Panel.svelte';
	import Sheet from '../Sheet.svelte';
	import BonusForm from './BonusForm.svelte';

	interface Entry {
		id: string;
		exercise: { name: string; kind: 'time' | 'reps' };
		minutes: number | null;
		reps: number | null;
		effort: Effort;
		distanceKm: number | null;
		bonusPoints: number;
	}

	interface CatalogExercise {
		id: string;
		name: string;
		kind: 'time' | 'reps';
		secondsPerRep: number | null;
		tracksDistance: boolean;
	}

	let {
		date,
		entries,
		overtimePoints,
		exercises
	}: { date: LocalDate; entries: Entry[]; overtimePoints: number; exercises: CatalogExercise[] } = $props();

	let open = $state(false);
	let confirmDelete = $state<string | null>(null);
	let error = $state('');

	const total = $derived(entries.reduce((sum, entry) => sum + entry.bonusPoints, 0) + overtimePoints);

	async function remove(id: string) {
		error = '';
		try {
			await actions.deleteBonus(id);
			await actions.refresh();
		} catch (caught) {
			error = errorMessage(caught);
		}
		confirmDelete = null;
	}

	function amount(entry: Entry): string {
		const base = entry.exercise.kind === 'time' ? `${entry.minutes} Min.` : `${entry.reps} Wdh.`;
		return entry.distanceKm ? `${base} · ${String(entry.distanceKm).replace('.', ',')} km` : base;
	}
</script>

<Panel title="Bonus" aside="+{points(total)} BP an diesem Tag">
	{#if entries.length === 0 && overtimePoints === 0}
		<p class="empty">Noch kein Zusatzsport. Jede Minute zählt für die Bonuswertung.</p>
	{:else}
		<ul class="entries">
			{#each entries as entry (entry.id)}
				<li>
					<div class="what">
						<span class="name">{entry.exercise.name}</span>
						<span class="detail">{amount(entry)} · {effortLabel(entry.effort)}</span>
					</div>
					<span class="bp num">+{points(entry.bonusPoints)}</span>
					{#if confirmDelete === entry.id}
						<button class="btn btn-danger btn-small" type="button" onclick={() => remove(entry.id)}>Löschen</button>
					{:else}
						<button class="icon-btn" type="button" aria-label="Eintrag löschen" onclick={() => (confirmDelete = entry.id)}>
							<Trash2 size={16} />
						</button>
					{/if}
				</li>
			{/each}
			{#if overtimePoints > 0}
				<li>
					<div class="what">
						<span class="name">Mehrleistung</span>
						<span class="detail">Über dein Planziel hinaus</span>
					</div>
					<span class="bp num">+{points(overtimePoints)}</span>
				</li>
			{/if}
		</ul>
	{/if}
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
	<button class="btn add" type="button" onclick={() => (open = true)}><Plus size={18} /> Zusatzübung eintragen</button>
</Panel>

<Sheet bind:open title="Zusatzübung eintragen">
	<BonusForm {exercises} {date} onDone={() => (open = false)} />
</Sheet>

<style>
	.empty {
		font-size: 14px;
		color: var(--muted);
	}

	.entries {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 48px;
		padding: 4px 0;
		border-bottom: 1px solid var(--line-faint);
	}

	.what {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.name {
		font-weight: 500;
	}

	.detail {
		font-size: 13px;
		color: var(--dim);
	}

	.bp {
		font-weight: 700;
		color: var(--accent-text);
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

	.add {
		width: 100%;
		margin-top: 12px;
		border-style: dashed;
		color: var(--dim);
		text-transform: none;
		letter-spacing: 0.02em;
		font-family: var(--f-body);
		font-weight: 500;
		font-size: 15px;
	}
</style>
