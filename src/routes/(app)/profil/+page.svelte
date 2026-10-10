<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import ColorPicker from '#lib/ui/ColorPicker.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import AdminPanel from '#lib/ui/profile/AdminPanel.svelte';
	import InstallGuide from '#lib/ui/profile/InstallGuide.svelte';
	import PushSettings from '#lib/ui/profile/PushSettings.svelte';

	let { data } = $props();

	let name = $state('');
	let color = $state('');
	let saved = $state(false);
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		name = data.me.name;
		color = data.me.color;
	});

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		error = '';
		saved = false;
		try {
			await apiFetch('/api/me', { method: 'PATCH', body: { name, color } });
			await refresh();
			saved = true;
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	async function logout() {
		await apiFetch('/api/auth/logout', { body: {} }).catch(() => {});
		await goto('/login', { refreshAll: true });
	}
</script>

<svelte:head><title>Profil · Level Up</title></svelte:head>

<div class="page">
	<h1 class="sys">Profil</h1>
	<div class="columns">
		<div class="stack">
			<Panel title="Dein Hunter">
				<form class="form" onsubmit={saveProfile}>
					<label class="field">
						<span>Name</span>
						<input class="input" id="profile-name" bind:value={name} minlength="2" maxlength="20" required />
					</label>
					<div class="field">
						<span>Farbe</span>
						<ColorPicker bind:value={color} />
					</div>
					{#if error}<p class="form-error" role="alert">{error}</p>{/if}
					<button class="btn btn-primary" type="submit" disabled={busy}>{saved ? 'Gespeichert' : 'Speichern'}</button>
				</form>
			</Panel>
			<PushSettings settings={data.settings} />
		</div>
		<div class="stack">
			<InstallGuide />
			{#if data.isAdmin}
				<AdminPanel hunters={data.hunters} meId={data.me.id} />
			{/if}
			<button class="btn btn-ghost logout" type="button" onclick={logout}>Abmelden</button>
		</div>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h1 {
		font-size: 20px;
		letter-spacing: 0.2em;
	}

	.columns {
		display: grid;
		gap: 16px;
		align-items: start;
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		align-items: flex-start;
	}

	.form .field {
		width: 100%;
	}

	.logout {
		align-self: flex-start;
	}

	@media (min-width: 1024px) {
		.columns {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
