<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import AuthFrame from '#lib/ui/AuthFrame.svelte';

	let name = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			await apiFetch('/api/auth/login', { body: { name, password } });
			await goto('/', { invalidateAll: true });
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Anmelden · Level Up</title></svelte:head>

<AuthFrame kicker="System" title="Hunter-Login">
	<form onsubmit={submit} class="form">
		<label class="field">
			<span>Name</span>
			<input class="input" id="name" bind:value={name} autocomplete="username" required />
		</label>
		<label class="field">
			<span>Passwort</span>
			<input
				class="input"
				id="password"
				type="password"
				bind:value={password}
				autocomplete="current-password"
				required
			/>
		</label>
		{#if error}<p class="form-error" role="alert">{error}</p>{/if}
		<button class="btn btn-primary btn-block" type="submit" disabled={busy}>
			{busy ? 'Melde an …' : 'Anmelden'}
		</button>
		<p class="hint">Noch kein Konto? Dafür brauchst du einen Einladungslink vom Admin.</p>
	</form>
</AuthFrame>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
