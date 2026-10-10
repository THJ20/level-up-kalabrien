<script lang="ts">
	import { Copy, Download } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import Avatar from '../Avatar.svelte';
	import Panel from '../Panel.svelte';

	let {
		hunters,
		meId
	}: { hunters: { id: string; name: string; color: string }[]; meId: string } = $props();

	let link = $state('');
	let copied = $state(false);
	let confirmId = $state<string | null>(null);
	let error = $state('');
	let busy = $state(false);
	let linkField: HTMLInputElement | undefined = $state();

	async function createInvite() {
		busy = true;
		error = '';
		copied = false;
		try {
			const result = await apiFetch<{ link: string }>('/api/admin/invites', { body: {} });
			link = result.link;
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			copied = true;
		} catch {
			linkField?.select();
		}
	}

	async function deactivate(id: string) {
		busy = true;
		error = '';
		try {
			await apiFetch(`/api/admin/hunters/${id}/deactivate`, { body: {} });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
			confirmId = null;
		}
	}
</script>

<Panel title="Admin">
	<section>
		<h3 class="sys">Einladen</h3>
		<p class="dim">Jeder Link gilt 7 Tage und nur für eine Person.</p>
		<button class="btn" type="button" disabled={busy} onclick={createInvite}>Neuen Einladungslink erstellen</button>
		{#if link}
			<div class="link">
				<input class="input" id="invite-link" readonly value={link} bind:this={linkField} onfocus={(event) => event.currentTarget.select()} />
				<button class="btn btn-primary" type="button" onclick={copy}><Copy size={16} /> {copied ? 'Kopiert' : 'Kopieren'}</button>
			</div>
		{/if}
	</section>

	<section>
		<h3 class="sys">Hunter</h3>
		<ul>
			{#each hunters as hunter (hunter.id)}
				<li>
					<Avatar name={hunter.name} color={hunter.color} size={28} />
					<span class="name">{hunter.name}</span>
					{#if hunter.id !== meId}
						{#if confirmId === hunter.id}
							<button class="btn btn-danger btn-small" type="button" disabled={busy} onclick={() => deactivate(hunter.id)}>Wirklich deaktivieren</button>
							<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmId = null)}>Nein</button>
						{:else}
							<button class="btn btn-ghost btn-small" type="button" onclick={() => (confirmId = hunter.id)}>Deaktivieren</button>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
		<p class="hint">Deaktivierte Hunter können sich nicht mehr anmelden und werden nicht mehr gewertet. Ihre Daten bleiben sichtbar.</p>
	</section>

	<section>
		<h3 class="sys">Backup</h3>
		<p class="dim">Lädt eine Kopie der kompletten Datenbank herunter. Am besten ab und zu außerhalb des Servers ablegen.</p>
		<a class="btn" href="/api/admin/backup" download><Download size={16} /> Backup herunterladen</a>
	</section>

	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	section + section {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px solid var(--line-faint);
	}

	h3 {
		font-size: 12px;
		color: var(--dim);
		margin-bottom: 6px;
	}

	section > .dim {
		font-size: 14px;
		margin-bottom: 10px;
	}

	.link {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	.link .input {
		flex: 1;
		min-width: 0;
		font-size: 13px;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 46px;
		border-bottom: 1px solid var(--line-faint);
	}

	.name {
		flex: 1;
	}

	.hint {
		margin-top: 8px;
	}
</style>
