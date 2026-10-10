<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		aside,
		tone = 'default',
		children,
		actions,
		class: className = ''
	}: {
		title?: string;
		aside?: string;
		tone?: 'default' | 'ok' | 'warn' | 'sick';
		children: Snippet;
		actions?: Snippet;
		class?: string;
	} = $props();
</script>

<section class="panel tone-{tone} {className}">
	{#if title || aside || actions}
		<header>
			{#if title}<h2 class="sys">{title}</h2>{/if}
			<div class="right">
				{#if aside}<span class="aside">{aside}</span>{/if}
				{#if actions}{@render actions()}{/if}
			</div>
		</header>
	{/if}
	{@render children()}
</section>

<style>
	.panel {
		position: relative;
		padding: 14px;
		background: var(--panel);
		border: 1px solid var(--line-dim);
		box-shadow: 0 0 22px rgba(120, 70, 255, 0.12);
		min-width: 0;
	}

	.panel::before,
	.panel::after {
		content: '';
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid var(--line);
		pointer-events: none;
	}

	.panel::before {
		top: -2px;
		left: -2px;
		border-right: none;
		border-bottom: none;
	}

	.panel::after {
		bottom: -2px;
		right: -2px;
		border-left: none;
		border-top: none;
	}

	.tone-ok {
		border-color: rgba(126, 240, 208, 0.45);
	}

	.tone-ok::before,
	.tone-ok::after {
		border-color: var(--ok);
	}

	.tone-warn::before,
	.tone-warn::after {
		border-color: var(--warn);
	}

	.tone-sick::before,
	.tone-sick::after {
		border-color: var(--sick);
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 10px;
	}

	h2 {
		font-size: 13px;
		letter-spacing: 0.18em;
	}

	.right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.aside {
		font-family: var(--f-sys);
		font-size: 12px;
		color: var(--dim);
		letter-spacing: 0.06em;
	}
</style>
