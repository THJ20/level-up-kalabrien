<script lang="ts">
	import { onMount } from 'svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { currentEnvironment, currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from '#lib/client/push.ts';
	import Panel from '../Panel.svelte';

	interface Settings {
		pushEnabled: boolean;
		reminderEnabled: boolean;
		reminderTime: string;
		votePushEnabled: boolean;
		soundEnabled: boolean;
	}

	let { settings }: { settings: Settings } = $props();

	let support = $state<PushSupport | null>(null);
	let subscribed = $state(false);
	let busy = $state(false);
	let error = $state('');

	onMount(async () => {
		support = pushSupport(currentEnvironment());
		if (support === 'ready') subscribed = (await currentSubscription().catch(() => null)) !== null;
	});

	async function toggleDevice() {
		busy = true;
		error = '';
		try {
			if (subscribed) await disablePush();
			else await enablePush();
			subscribed = !subscribed;
		} catch (caught) {
			error = caught instanceof Error && !(caught instanceof TypeError) ? caught.message : errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	async function save(patch: Partial<Settings>) {
		error = '';
		try {
			await apiFetch('/api/me/settings', { method: 'PATCH', body: patch });
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		}
	}
</script>

<Panel title="Benachrichtigungen">
	<div class="device">
		{#if support === null}
			<p class="dim">Prüfe dieses Gerät …</p>
		{:else if support === 'needs-install'}
			<p>Auf dem iPhone kommen Benachrichtigungen nur, wenn die App auf dem Homescreen liegt. Installier sie zuerst (Anleitung unten) und öffne sie dann von dort.</p>
		{:else if support === 'unsupported'}
			<p>Dieser Browser unterstützt keine Push-Benachrichtigungen.</p>
		{:else if support === 'denied'}
			<p>Benachrichtigungen sind für diese Seite blockiert. Du kannst sie in den Browser-Einstellungen wieder erlauben.</p>
		{:else}
			<p>{subscribed ? 'Dieses Gerät bekommt Benachrichtigungen.' : 'Dieses Gerät bekommt noch keine Benachrichtigungen.'}</p>
			<button class="btn {subscribed ? 'btn-ghost' : 'btn-primary'}" type="button" disabled={busy} onclick={toggleDevice}>
				{subscribed ? 'Auf diesem Gerät ausschalten' : 'Auf diesem Gerät aktivieren'}
			</button>
		{/if}
	</div>

	<div class="toggles">
		<label class="toggle">
			<input type="checkbox" checked={settings.pushEnabled} onchange={(event) => save({ pushEnabled: event.currentTarget.checked })} />
			<span><b>Benachrichtigungen</b><small>Hauptschalter für alle Geräte</small></span>
		</label>
		<label class="toggle" class:off={!settings.pushEnabled}>
			<input type="checkbox" checked={settings.reminderEnabled} disabled={!settings.pushEnabled} onchange={(event) => save({ reminderEnabled: event.currentTarget.checked })} />
			<span><b>Abenderinnerung</b><small>Wenn die Daily Quest noch offen ist</small></span>
		</label>
		{#if settings.pushEnabled && settings.reminderEnabled}
			<label class="field time">
				<span>Uhrzeit der Erinnerung</span>
				<input class="input num" id="reminder-time" type="time" value={settings.reminderTime} onchange={(event) => save({ reminderTime: event.currentTarget.value })} />
			</label>
		{/if}
		<label class="toggle" class:off={!settings.pushEnabled}>
			<input type="checkbox" checked={settings.votePushEnabled} disabled={!settings.pushEnabled} onchange={(event) => save({ votePushEnabled: event.currentTarget.checked })} />
			<span><b>Abstimmungen</b><small>Wenn eine Strafabstimmung startet und du noch nicht abgestimmt hast</small></span>
		</label>
		<label class="toggle">
			<input type="checkbox" checked={settings.soundEnabled} onchange={(event) => save({ soundEnabled: event.currentTarget.checked })} />
			<span><b>Ton bei System-Meldungen</b><small>Kurzer Klang bei Quest complete, Level-up und Co.</small></span>
		</label>
	</div>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	.device {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
		padding-bottom: 14px;
		margin-bottom: 6px;
		border-bottom: 1px solid var(--line-faint);
		font-size: 15px;
	}

	.toggles {
		display: flex;
		flex-direction: column;
	}

	.toggle {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 10px 0;
		cursor: pointer;
	}

	.toggle.off {
		opacity: 0.5;
	}

	.toggle input {
		flex: none;
		width: 20px;
		height: 20px;
		margin-top: 2px;
		accent-color: var(--line);
	}

	.toggle span {
		display: flex;
		flex-direction: column;
	}

	small {
		font-size: 13px;
		color: var(--dim);
	}

	.time {
		max-width: 200px;
		margin: 0 0 6px 32px;
	}
</style>
