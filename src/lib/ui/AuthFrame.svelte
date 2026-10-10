<script lang="ts">
	import type { Snippet } from 'svelte';

	let { kicker, title, children }: { kicker: string; title: string; children: Snippet } = $props();
</script>

<div class="frame">
	<div class="window">
		<p class="kicker sys">[ {kicker} ]</p>
		<h1 class="sys">{title}</h1>
		{@render children()}
	</div>
	<p class="footer sys">Level Up · Kalabrien</p>
</div>

<style>
	.frame {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 24px;
		padding: 24px 16px;
	}

	.window {
		position: relative;
		width: min(420px, 100%);
		padding: 28px 22px 24px;
		background: var(--panel);
		border: 1px solid var(--line);
		box-shadow:
			0 0 40px rgba(var(--glow-rgb), 0.28),
			inset 0 0 30px rgba(var(--accent-rgb), 0.08);
		animation: appear 0.5s cubic-bezier(0.2, 1.2, 0.4, 1);
	}

	.kicker {
		text-align: center;
		color: var(--dim);
		font-size: 12px;
		letter-spacing: 0.3em;
	}

	h1 {
		margin: 10px 0 22px;
		text-align: center;
		font-size: 22px;
		letter-spacing: 0.1em;
		text-shadow: 0 0 18px var(--glow);
	}

	.footer {
		color: var(--muted);
		font-size: 11px;
		letter-spacing: 0.3em;
	}

	@keyframes appear {
		from {
			opacity: 0;
			transform: scale(0.94);
		}
	}
</style>
