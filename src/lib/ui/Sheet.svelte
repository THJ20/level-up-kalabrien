<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: { open: boolean; title: string; children: Snippet } = $props();

	let panel: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!open || !panel) return;
		const previous = document.activeElement as HTMLElement | null;
		const first = panel.querySelector<HTMLElement>('input, select, textarea, button:not(.close)');
		first?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false;
		};
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
			previous?.focus?.();
		};
	});
</script>

{#if open}
	<div class="backdrop" role="presentation" onclick={() => (open = false)}></div>
	<div class="sheet" role="dialog" aria-modal="true" aria-label={title} bind:this={panel}>
		<header>
			<h2 class="sys">{title}</h2>
			<button class="btn btn-ghost close" type="button" aria-label="Schließen" onclick={() => (open = false)}>
				<X size={20} />
			</button>
		</header>
		<div class="body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(var(--shade-rgb), 0.72);
		animation: fade 0.15s ease-out;
	}

	.sheet {
		position: fixed;
		z-index: 41;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 88dvh;
		display: flex;
		flex-direction: column;
		background: var(--panel-solid);
		border-top: 1px solid var(--line);
		box-shadow: 0 -10px 40px rgba(120, 70, 255, 0.25);
		padding-bottom: var(--safe-bottom);
		animation: rise 0.22s ease-out;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 8px 4px 16px;
	}

	h2 {
		font-size: 14px;
		letter-spacing: 0.16em;
	}

	.body {
		overflow-y: auto;
		padding: 8px 16px 20px;
	}

	@media (min-width: 720px) {
		.sheet {
			left: 50%;
			right: auto;
			bottom: auto;
			top: 50%;
			width: min(560px, calc(100vw - 32px));
			transform: translate(-50%, -50%);
			border: 1px solid var(--line);
			animation: fade 0.18s ease-out;
		}
	}

	@keyframes rise {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
