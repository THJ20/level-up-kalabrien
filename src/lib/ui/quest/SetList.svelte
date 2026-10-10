<script lang="ts">
	import { Check, Pencil, Trash2, X } from '@lucide/svelte';
	import { SET_LIMITS, UNIT_LABELS, type PlanUnit } from '#lib/domain/index.ts';
	import { amount, clockTime } from '#lib/client/format.ts';

	interface SetEntry {
		id: string;
		exerciseId: string;
		exerciseName: string;
		value: number;
		recordedAt: Date;
	}

	let {
		sets,
		units,
		onUpdate,
		onDelete
	}: {
		sets: SetEntry[];
		/** Einheit je Übung im Plan des Tages. */
		units: Record<string, PlanUnit>;
		onUpdate: (id: string, value: number) => void;
		onDelete: (id: string) => void;
	} = $props();

	let editing = $state<string | null>(null);
	let editValue = $state<number | null>(null);
	let confirmDelete = $state<string | null>(null);

	const unitOf = (entry: SetEntry): PlanUnit => units[entry.exerciseId] ?? 'reps';

	function startEdit(entry: SetEntry) {
		editing = entry.id;
		editValue = entry.value;
		confirmDelete = null;
	}

	function saveEdit(event: SubmitEvent, id: string) {
		event.preventDefault();
		if (editValue && editValue > 0) onUpdate(id, editValue);
		editing = null;
	}
</script>

{#if sets.length === 0}
	<p class="empty">Noch keine Sätze an diesem Tag.</p>
{:else}
	<ul class="sets">
		{#each [...sets].reverse() as entry (entry.id)}
			{@const unit = unitOf(entry)}
			<li>
				<span class="time num">{clockTime(entry.recordedAt)}</span>
				<span class="ex sys">{entry.exerciseName}</span>
				{#if editing === entry.id}
					<form class="edit" onsubmit={(event) => saveEdit(event, entry.id)}>
						<input
							class="input num"
							type="number"
							min={SET_LIMITS[unit].min}
							max={SET_LIMITS[unit].max}
							step={unit === 'km' ? 0.1 : 1}
							aria-label="{UNIT_LABELS[unit].long} ändern"
							bind:value={editValue}
						/>
						<button class="icon-btn ok" type="submit" aria-label="Speichern"><Check size={18} /></button>
						<button class="icon-btn" type="button" aria-label="Abbrechen" onclick={() => (editing = null)}>
							<X size={18} />
						</button>
					</form>
				{:else if confirmDelete === entry.id}
					<span class="confirm">
						Löschen?
						<button class="btn btn-danger btn-small" type="button" onclick={() => onDelete(entry.id)}>Ja</button>
						<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmDelete = null)}>Nein</button>
					</span>
				{:else}
					<span class="reps num">{unit === 'reps' ? entry.value : amount(entry.value, unit)}</span>
					<span class="actions">
						<button class="icon-btn" type="button" aria-label="Satz ändern" onclick={() => startEdit(entry)}>
							<Pencil size={16} />
						</button>
						<button
							class="icon-btn"
							type="button"
							aria-label="Satz löschen"
							onclick={() => {
								confirmDelete = entry.id;
								editing = null;
							}}
						>
							<Trash2 size={16} />
						</button>
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.empty {
		font-size: 14px;
		color: var(--muted);
	}

	.sets {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 4px 0;
		border-top: 1px solid var(--line-faint);
	}

	.time {
		color: var(--muted);
		font-size: 13px;
		width: 44px;
	}

	.ex {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		color: var(--dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.reps {
		font-weight: 600;
		font-size: 16px;
		white-space: nowrap;
	}

	.actions,
	.edit,
	.confirm {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.confirm {
		font-size: 14px;
		gap: 8px;
	}

	.edit .input {
		width: 84px;
		min-height: 36px;
		padding: 4px 8px;
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

	.icon-btn:hover {
		color: var(--text);
	}

	.icon-btn.ok {
		color: var(--ok);
	}
</style>
