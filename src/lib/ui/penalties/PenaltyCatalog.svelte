<script lang="ts">
	import { Archive, Pencil } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import Panel from '../Panel.svelte';

	interface Penalty {
		id: string;
		title: string;
		description: string;
		createdBy: string;
	}

	let {
		penalties,
		meId,
		names
	}: { penalties: Penalty[]; meId: string; names: Record<string, string> } = $props();

	let adding = $state(false);
	let editing = $state<string | null>(null);
	let confirmArchive = $state<string | null>(null);
	let title = $state('');
	let description = $state('');
	let error = $state('');
	let busy = $state(false);

	function startEdit(penalty: Penalty) {
		editing = penalty.id;
		adding = false;
		title = penalty.title;
		description = penalty.description;
	}

	function startAdd() {
		adding = true;
		editing = null;
		title = '';
		description = '';
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		try {
			if (editing) await apiFetch(`/api/penalties/${editing}`, { method: 'PATCH', body: { title, description } });
			else await apiFetch('/api/penalties', { body: { title, description } });
			adding = false;
			editing = null;
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	async function archive(id: string) {
		busy = true;
		error = '';
		try {
			await apiFetch(`/api/penalties/${id}`, { method: 'DELETE' });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
			confirmArchive = null;
		}
	}
</script>

{#snippet form()}
	<form class="form" onsubmit={save}>
		<label class="field">
			<span>Titel</span>
			<input class="input" id="penalty-title" bind:value={title} maxlength="80" required />
		</label>
		<label class="field">
			<span>Beschreibung (optional)</span>
			<textarea class="input" id="penalty-description" rows="2" bind:value={description} maxlength="500"></textarea>
		</label>
		<div class="actions">
			<button class="btn btn-primary" type="submit" disabled={busy}>{editing ? 'Speichern' : 'Anlegen'}</button>
			<button
				class="btn btn-ghost"
				type="button"
				onclick={() => {
					adding = false;
					editing = null;
				}}>Abbrechen</button
			>
		</div>
	</form>
{/snippet}

<Panel title="Strafkatalog" aside="{penalties.length} Strafen">
	{#if penalties.length === 0 && !adding}
		<p class="empty">Noch keine Strafen. Leg die erste an, damit bei verpassten Tagen abgestimmt werden kann.</p>
	{/if}
	<ul>
		{#each penalties as penalty (penalty.id)}
			<li>
				{#if editing === penalty.id}
					{@render form()}
				{:else}
					<div class="text">
						<b>{penalty.title}</b>
						{#if penalty.description}<span class="desc">{penalty.description}</span>{/if}
						<span class="by">von {names[penalty.createdBy] ?? 'ehemaligem Hunter'}</span>
					</div>
					{#if penalty.createdBy === meId}
						{#if confirmArchive === penalty.id}
							<span class="confirm">
								<button class="btn btn-danger btn-small" type="button" onclick={() => archive(penalty.id)}>Archivieren</button>
								<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmArchive = null)}>Nein</button>
							</span>
						{:else}
							<span class="tools">
								<button class="icon-btn" type="button" aria-label="Strafe bearbeiten" onclick={() => startEdit(penalty)}>
									<Pencil size={16} />
								</button>
								<button class="icon-btn" type="button" aria-label="Strafe archivieren" onclick={() => (confirmArchive = penalty.id)}>
									<Archive size={16} />
								</button>
							</span>
						{/if}
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
	{#if adding}
		{@render form()}
	{:else}
		<button class="btn btn-block add" type="button" onclick={startAdd}>Strafe anlegen</button>
	{/if}
</Panel>

<style>
	.empty {
		color: var(--muted);
		font-size: 14px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 0;
		border-bottom: 1px solid var(--line-faint);
	}

	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.desc {
		font-size: 14px;
		color: var(--dim);
	}

	.by {
		font-size: 12px;
		color: var(--muted);
	}

	.tools,
	.confirm {
		display: flex;
		gap: 4px;
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

	.form {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 10px;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.add {
		margin-top: 12px;
	}
</style>
