<script lang="ts">
	import { onMount } from 'svelte';
	import Panel from '../Panel.svelte';

	interface InstallPrompt extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	let installed = $state(false);
	let platform = $state<'ios' | 'android' | 'desktop'>('desktop');
	let prompt = $state<InstallPrompt | null>(null);

	onMount(() => {
		const nav = navigator as Navigator & { standalone?: boolean };
		installed = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
		platform = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop';
		const capture = (event: Event) => {
			event.preventDefault();
			prompt = event as InstallPrompt;
		};
		window.addEventListener('beforeinstallprompt', capture);
		return () => window.removeEventListener('beforeinstallprompt', capture);
	});

	async function install() {
		if (!prompt) return;
		await prompt.prompt();
		const choice = await prompt.userChoice;
		if (choice.outcome === 'accepted') installed = true;
		prompt = null;
	}
</script>

<Panel title="App installieren">
	{#if installed}
		<p>Läuft schon als App. Stark.</p>
	{:else}
		{#if prompt}
			<button class="btn btn-primary" type="button" onclick={install}>Jetzt installieren</button>
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
		background: rgba(164, 124, 255, 0.08);
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
