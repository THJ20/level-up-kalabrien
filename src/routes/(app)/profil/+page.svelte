<script lang="ts">
	import { goto } from '$app/navigation';
	import { ClipboardList } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import ColorPicker from '#lib/ui/ColorPicker.svelte';
	import Panel from '#lib/ui/Panel.svelte';
	import AdminPanel from '#lib/ui/profile/AdminPanel.svelte';
	import AvatarSettings from '#lib/ui/profile/AvatarSettings.svelte';
	import InstallGuide from '#lib/ui/profile/InstallGuide.svelte';
	import PushSettings from '#lib/ui/profile/PushSettings.svelte';
	import ThemePicker from '#lib/ui/profile/ThemePicker.svelte';

	let { data } = $props();

	let displayName = $state('');
	let color = $state('');
	let saved = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		displayName = data.me.displayName ?? '';
		color = data.me.color;
	});

	async function update(patch: { displayName?: string | null; color?: string }, message: string) {
		busy = true;
		error = '';
		saved = '';
		try {
			await apiFetch('/api/me', { method: 'PATCH', body: patch });
			await refresh();
			saved = message;
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		void update({ displayName: displayName.trim() || null, color }, 'Gespeichert.');
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
					<div class="field">
						<span>Login-Name</span>
						<p class="login">{data.me.loginName}</p>
						<span class="hint">Damit meldest du dich an. Er bleibt fest.</span>
					</div>
					<label class="field">
						<span>Spielername</span>
						<input
							class="input"
							id="profile-display-name"
							bind:value={displayName}
							maxlength="20"
							placeholder={data.me.loginName}
							autocomplete="off"
						/>
						<span class="hint">So sehen dich alle in der App. Leer lassen, dann gilt dein Login-Name.</span>
					</label>
					<div class="field">
						<span>Farbe</span>
						<ColorPicker bind:value={color} />
					</div>
					{#if error}<p class="form-error" role="alert">{error}</p>{/if}
					{#if saved && !busy}<p class="saved" role="status">{saved}</p>{/if}
					<div class="buttons">
						<button class="btn btn-primary" type="submit" disabled={busy}>Speichern</button>
						{#if data.me.displayName}
							<button
								class="btn btn-ghost"
								type="button"
								disabled={busy}
								onclick={() => update({ displayName: null }, 'Spielername gelöscht.')}
							>
								Spielername löschen
							</button>
						{/if}
					</div>
				</form>
			</Panel>
			<AvatarSettings name={data.me.name} color={data.me.color} avatarUrl={data.me.avatarUrl} />
			<ThemePicker theme={data.me.theme} />
		</div>
		<div class="stack">
			<Panel title="Trainingsplan">
				<p class="hint">Dein Plan ist deine Daily Quest. Du kannst ihn jederzeit ändern oder neu importieren.</p>
				<a class="btn plan" href="/plan"><ClipboardList size={18} /> Zum Trainingsplan</a>
			</Panel>
			<PushSettings settings={data.settings} />
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

	.login {
		font-family: var(--f-sys);
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.saved {
		color: var(--ok);
		font-size: 14px;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.plan {
		margin-top: 10px;
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
