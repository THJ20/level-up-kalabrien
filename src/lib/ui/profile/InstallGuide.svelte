<script lang="ts">
	import { installState, promptInstall } from '#lib/client/install.svelte.ts';
	import Panel from '../Panel.svelte';

	const platform = $derived(installState.platform);
</script>

<Panel title="App installieren">
	{#if installState.standalone}
		<p>Läuft schon als App. Stark.</p>
	{:else}
		{#if !installState.secure}
			<p class="hint">Installieren geht erst, wenn die App über HTTPS läuft, also auf dem Server.</p>
		{/if}
		{#if installState.prompt}
			<button class="btn btn-primary" type="button" onclick={promptInstall}>Jetzt installieren</button>
		{/if}
		<div class="guides">
			<section class:current={platform === 'ios'}>
				<h3 class="sys">iPhone (Safari)</h3>
				<ol>
					<li>Diese Seite in Safari öffnen.</li>
					<li>Unten auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben).</li>
					<li>„Zum Home-Bildschirm“ wählen und bestätigen.</li>
					<li>Ab jetzt die App über das Icon öffnen, dann gehen auch Benachrichtigungen.</li>
				</ol>
			</section>
			<section class:current={platform === 'android'}>
				<h3 class="sys">Android (Chrome)</h3>
				<ol>
					<li>Oben rechts auf die drei Punkte tippen.</li>
					<li>„App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</li>
					<li>Bestätigen und die App über das Icon öffnen.</li>
				</ol>
			</section>
		</div>
	{/if}
</Panel>

<style>
	.guides {
		display: grid;
		gap: 12px;
		margin-top: 8px;
	}

	section {
		padding: 10px 12px;
		border: 1px solid var(--line-faint);
	}

	section.current {
		border-color: var(--line);
		background: rgba(var(--accent-rgb), 0.08);
	}

	h3 {
		font-size: 13px;
		margin-bottom: 6px;
	}

	ol {
		margin: 0;
		padding-left: 20px;
		font-size: 15px;
		color: var(--dim);
	}

	@media (min-width: 720px) {
		.guides {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
