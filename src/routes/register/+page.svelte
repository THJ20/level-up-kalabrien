<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { AVATAR_COLORS, MIN_PASSWORD_LENGTH } from '#lib/shared/constants.ts';
	import AuthFrame from '#lib/ui/AuthFrame.svelte';
	import ColorPicker from '#lib/ui/ColorPicker.svelte';

	let { data } = $props();

	let name = $state('');
	let password = $state('');
	let color = $state<string>(AVATAR_COLORS[0]);
	let error = $state('');
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		busy = true;
		try {
			await apiFetch('/api/auth/register', { body: { token: data.token, name, password, color } });
			await goto('/', { invalidateAll: true });
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Registrieren · Level Up</title></svelte:head>

{#if data.valid}
	<AuthFrame kicker="System" title="Du wurdest erwählt">
		<p class="intro">
			Du bist zur Challenge eingeladen. Jeden Tag 100 Liegestütze, 100 Kniebeugen und 100 Sit-ups bis
			zum Abflug nach Kalabrien.
			{#if data.role === 'admin'}Du wirst Admin der Gruppe.{/if}
		</p>
		<form onsubmit={submit} class="form">
			<label class="field">
				<span>Name (so sehen dich die anderen)</span>
				<input class="input" id="name" bind:value={name} autocomplete="username" minlength="2" maxlength="20" required />
			</label>
			<label class="field">
				<span>Passwort (mindestens {MIN_PASSWORD_LENGTH} Zeichen)</span>
				<input
					class="input"
					id="password"
					type="password"
					bind:value={password}
					autocomplete="new-password"
					minlength={MIN_PASSWORD_LENGTH}
					required
				/>
			</label>
			<div class="field">
				<span>Deine Farbe</span>
				<ColorPicker bind:value={color} />
			</div>
			{#if error}<p class="form-error" role="alert">{error}</p>{/if}
			<button class="btn btn-primary btn-block" type="submit" disabled={busy}>
				{busy ? 'Erwache …' : 'Challenge annehmen'}
			</button>
		</form>
	</AuthFrame>
{:else}
	<AuthFrame kicker="Warning" title="Link ungültig">
		<p class="intro">
			Dieser Einladungslink ist ungültig, schon benutzt oder älter als 7 Tage. Frag beim Admin nach
			einem neuen Link.
		</p>
		<a class="btn btn-block" href="/login">Zum Login</a>
	</AuthFrame>
{/if}

<style>
	.intro {
		margin-bottom: 18px;
		color: var(--dim);
		text-align: center;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
</style>
