<script lang="ts">
	import { Download, X } from '@lucide/svelte';
	import { installState, promptInstall } from '#lib/client/install.svelte.ts';
	import { readJson, writeJson } from '#lib/client/storage.ts';

	const KEY = 'lu:install-dismissed';
	let dismissed = $state(true);

	$effect(() => {
		dismissed = readJson<boolean>(KEY) ?? false;
	});

	const visible = $derived(
		!dismissed && installState.secure && !installState.standalone && installState.platform !== 'desktop'
	);

	function dismiss() {
		dismissed = true;
		writeJson(KEY, true);
	}
</script>

{#if visible}
	<aside class="banner" aria-label="App installieren">
		<Download size={20} />
		<div class="text">
			<b class="sys">Level Up als App</b>
			{#if installState.prompt}
				<span>Mit eigenem Icon, Vollbild und Benachrichtigungen.</span>
			{:else if installState.platform === 'ios'}
				<span>In Safari unten auf Teilen tippen, dann „Zum Home-Bildschirm“.</span>
			{:else}
				<span>Im Browser-Menü „App installieren“ wählen.</span>
			{/if}
		</div>
		{#if installState.prompt}
			<button class="btn btn-primary btn-small" type="button" onclick={promptInstall}>Installieren</button>
		{/if}
		<button class="close" type="button" aria-label="Hinweis ausblenden" onclick={dismiss}><X size={18} /></button>
	</aside>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 1px solid var(--line-dim);
		background: rgba(var(--accent-rgb), 0.08);
	}

	.banner > :global(svg) {
		flex: none;
		color: var(--line);
	}

	.text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		font-size: 13px;
		color: var(--dim);
	}

	.text b {
		font-size: 13px;
		color: var(--text);
	}

	.close {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: none;
		background: none;
		color: var(--muted);
		cursor: pointer;
	}
</style>
