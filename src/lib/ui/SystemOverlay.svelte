<script lang="ts">
	import type { SystemMessage } from '#lib/client/progress.ts';
	import { playChime } from '#lib/client/sound.ts';

	let {
		message,
		sound,
		remaining,
		onDismiss
	}: { message: SystemMessage; sound: boolean; remaining: number; onDismiss: () => void } = $props();

	let button: HTMLButtonElement | undefined = $state();

	$effect(() => {
		const current = message;
		if (sound) playChime(current.kind);
		button?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape' || event.key === 'Enter') onDismiss();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div class="overlay kind-{message.kind}" role="presentation" onclick={onDismiss}>
	<div class="burst" aria-hidden="true"></div>
	{#key message.id}
		<div
			class="window"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="system-title"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={() => {}}
		>
			<p class="kicker sys">[ {message.kind === 'warning' ? 'WARNING' : 'SYSTEM'} ]</p>
			<h2 id="system-title" class="title sys">{message.title}</h2>
			{#if message.subtitle}<p class="subtitle sys">{message.subtitle}</p>{/if}
			{#if message.body}<p class="body">{message.body}</p>{/if}
			<button class="ok sys" type="button" bind:this={button} onclick={onDismiss}>
				{remaining > 1 ? `Weiter (${remaining - 1})` : 'OK'}
			</button>
		</div>
	{/key}
</div>

<style>
	.overlay {
		--accent: var(--line);
		--accent-glow: var(--glow);
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		padding: 24px;
		background: rgba(2, 1, 6, 0.78);
		animation: fade 0.2s ease-out;
	}

	.kind-quest_complete {
		--accent: var(--ok);
		--accent-glow: rgba(126, 240, 208, 0.55);
	}

	.kind-rank_up {
		--accent: var(--gold);
		--accent-glow: rgba(245, 197, 66, 0.6);
	}

	.kind-warning {
		--accent: var(--warn);
		--accent-glow: rgba(255, 79, 123, 0.55);
	}

	.burst {
		position: absolute;
		width: 520px;
		height: 520px;
		max-width: 140vw;
		border-radius: 50%;
		background: radial-gradient(circle, var(--accent-glow) 0%, transparent 62%);
		opacity: 0.55;
		animation: burst 1.6s ease-out;
		pointer-events: none;
	}

	.window {
		position: relative;
		width: min(400px, 100%);
		padding: 26px 20px 20px;
		text-align: center;
		background: var(--panel-solid);
		border: 1px solid var(--accent);
		box-shadow:
			0 0 46px var(--accent-glow),
			inset 0 0 30px rgba(164, 124, 255, 0.08);
		animation: pop 0.55s cubic-bezier(0.2, 1.4, 0.4, 1);
	}

	.kicker {
		font-size: 12px;
		letter-spacing: 0.32em;
		color: var(--dim);
	}

	.title {
		margin-top: 12px;
		font-size: clamp(28px, 9vw, 38px);
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--text);
		text-shadow: 0 0 22px var(--accent-glow);
		animation: pulse 1.8s ease-in-out infinite;
	}

	.subtitle {
		margin-top: 6px;
		font-size: 17px;
		letter-spacing: 0.14em;
		color: var(--accent);
	}

	.body {
		margin-top: 12px;
		color: var(--dim);
		font-size: 15px;
	}

	.ok {
		margin-top: 20px;
		min-width: 120px;
		min-height: 42px;
		padding: 8px 20px;
		border: 1px solid var(--accent);
		background: none;
		color: var(--text);
		font-size: 14px;
		letter-spacing: 0.22em;
		cursor: pointer;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: scale(0.7);
		}
	}

	@keyframes burst {
		from {
			opacity: 0;
			transform: scale(0.2);
		}
	}

	@keyframes pulse {
		50% {
			text-shadow:
				0 0 30px var(--accent-glow),
				0 0 60px var(--accent-glow);
		}
	}
</style>
