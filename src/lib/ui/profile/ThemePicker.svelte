<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { THEMES, THEME_LABELS, type Theme } from '#lib/shared/constants.ts';
	import Panel from '../Panel.svelte';

	let { theme }: { theme: Theme } = $props();

	let busy = $state(false);
	let error = $state('');

	async function choose(next: Theme) {
		if (next === theme) return;
		busy = true;
		error = '';
		document.documentElement.dataset.theme = next;
		try {
			await apiFetch('/api/me', { method: 'PATCH', body: { theme: next } });
			await refresh();
		} catch (caught) {
			document.documentElement.dataset.theme = theme;
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}
</script>

<Panel title="Farbschema">
	<div class="themes" role="radiogroup" aria-label="Farbschema">
		{#each THEMES as option (option)}
			<button
				type="button"
				class="theme t-{option}"
				class:active={theme === option}
				role="radio"
				aria-checked={theme === option}
				disabled={busy}
				onclick={() => choose(option)}
			>
				<span class="swatch" aria-hidden="true"><i></i><i></i><i></i></span>
				<span class="text">
					<b class="sys">{THEME_LABELS[option].name}</b>
					<span>{THEME_LABELS[option].description}</span>
				</span>
				{#if theme === option}<Check size={18} />{/if}
			</button>
		{/each}
	</div>
	<p class="hint">Gilt nur für dich, auf allen deinen Geräten.</p>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	.themes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
	}

	.theme {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--line-faint);
		background: rgba(var(--accent-rgb), 0.04);
		color: var(--text);
		text-align: left;
		cursor: pointer;
	}

	.theme.active {
		border-color: var(--line);
		box-shadow: 0 0 12px var(--glow-soft);
	}

	.theme :global(svg) {
		margin-left: auto;
		color: var(--line);
	}

	.swatch {
		display: flex;
		flex: none;
		width: 54px;
		height: 36px;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.swatch i {
		flex: 1;
	}

	.t-monarch .swatch i:nth-child(1) {
		background: #05030a;
	}

	.t-monarch .swatch i:nth-child(2) {
		background: #140a24;
	}

	.t-monarch .swatch i:nth-child(3) {
		background: #a47cff;
	}

	.t-gate .swatch i:nth-child(1) {
		background: #070504;
	}

	.t-gate .swatch i:nth-child(2) {
		background: #1a0f08;
	}

	.t-gate .swatch i:nth-child(3) {
		background: #ff8a3d;
	}

	.text {
		display: flex;
		flex-direction: column;
		font-size: 14px;
		color: var(--dim);
	}

	.text b {
		font-size: 14px;
		color: var(--text);
	}

	.hint {
		margin-top: 10px;
	}
</style>
