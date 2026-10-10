<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { Activity, ChartColumn, Gavel, Swords, Trophy } from '@lucide/svelte';
	import {
		progressMessages,
		warningMessages,
		type ProgressSnapshot,
		type SystemMessage
	} from '#lib/client/progress.ts';
	import { readJson, writeJson } from '#lib/client/storage.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import SystemOverlay from '#lib/ui/SystemOverlay.svelte';

	let { data, children } = $props();

	let queue = $state<SystemMessage[]>([]);

	$effect(() => {
		const progressKey = `lu:progress:${data.me.id}`;
		const seenKey = `lu:seen-warnings:${data.me.id}`;
		const progress: ProgressSnapshot = data.progress;
		const fresh = progressMessages(readJson<ProgressSnapshot>(progressKey), progress);
		writeJson(progressKey, progress);

		const seen = readJson<string[]>(seenKey) ?? [];
		const warnings = warningMessages(data.recentMissed, new Set(seen));
		writeJson(seenKey, [...seen, ...data.recentMissed.map((notice) => notice.id)].slice(-200));

		const incoming = [...warnings, ...fresh];
		if (incoming.length === 0) return;
		untrack(() => {
			const known = new Set(queue.map((message) => message.id));
			queue = [...queue, ...incoming.filter((message) => !known.has(message.id))];
		});
	});

	const nav = [
		{ href: '/', label: 'Quest', icon: Swords },
		{ href: '/statistik', label: 'Statistik', icon: ChartColumn },
		{ href: '/rangliste', label: 'Rangliste', icon: Trophy },
		{ href: '/feed', label: 'Feed', icon: Activity },
		{ href: '/strafen', label: 'Strafen', icon: Gavel }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path.startsWith(href);
	}

	onMount(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () => {
			clearTimeout(timer);
			timer = setTimeout(() => invalidate('app:data'), 250);
		};
		const source = new EventSource('/api/events');
		source.addEventListener('change', refresh);
		const onVisible = () => {
			if (document.visibilityState === 'visible') refresh();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			source.close();
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
</script>

<div class="shell">
	<header class="topbar">
		<a class="brand sys" href="/">Level Up <span>·</span> Kalabrien</a>
		<a class="me" href="/profil" aria-label="Profil und Einstellungen">
			<Avatar name={data.me.name} color={data.me.color} size={34} />
		</a>
	</header>

	<nav class="nav" aria-label="Hauptnavigation">
		<a class="brand sys desktop-only" href="/">Level Up<br /><span>Kalabrien</span></a>
		{#each nav as item (item.href)}
			{@const Icon = item.icon}
			<a href={item.href} class:active={isActive(item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
				<span class="icon">
					<Icon size={22} strokeWidth={1.75} />
					{#if item.href === '/strafen' && data.openVotes > 0}
						<span class="badge num" aria-label="{data.openVotes} offene Abstimmungen">{data.openVotes}</span>
					{/if}
				</span>
				<span class="label">{item.label}</span>
			</a>
		{/each}
		<a class="profile desktop-only" href="/profil" class:active={isActive('/profil')}>
			<Avatar name={data.me.name} color={data.me.color} size={30} />
			<span class="label">{data.me.name}</span>
		</a>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

{#if queue.length > 0}
	<SystemOverlay
		message={queue[0]}
		remaining={queue.length}
		sound={data.settings.soundEnabled}
		onDismiss={() => (queue = queue.slice(1))}
	/>
{/if}

<style>
	.shell {
		min-height: 100dvh;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(var(--safe-top) + 10px) 16px 10px;
		background: linear-gradient(180deg, rgba(5, 3, 10, 0.96), rgba(5, 3, 10, 0.82));
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--line-faint);
	}

	.brand {
		color: var(--text);
		text-decoration: none;
		font-size: 14px;
		letter-spacing: 0.16em;
	}

	.brand span {
		color: var(--line);
	}

	.me {
		display: inline-flex;
		border-radius: 50%;
		text-decoration: none;
	}

	.nav {
		position: fixed;
		z-index: 20;
		left: 0;
		right: 0;
		bottom: 0;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		padding: 6px 0 calc(var(--safe-bottom) + 8px);
		background: rgba(8, 4, 16, 0.96);
		backdrop-filter: blur(8px);
		border-top: 1px solid var(--line-faint);
	}

	.nav a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 4px 0;
		color: var(--muted);
		text-decoration: none;
		font-size: 11px;
		letter-spacing: 0.04em;
	}

	.nav a.active {
		color: var(--line);
	}

	.nav a.active .icon {
		filter: drop-shadow(0 0 6px var(--glow));
	}

	.icon {
		position: relative;
		display: inline-flex;
	}

	.badge {
		position: absolute;
		top: -6px;
		right: -10px;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--warn);
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		line-height: 18px;
		text-align: center;
	}

	.desktop-only {
		display: none !important;
	}

	.content {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 16px 16px calc(var(--nav-h) + var(--safe-bottom) + 24px);
	}

	@media (min-width: 1024px) {
		.topbar {
			display: none;
		}

		.nav {
			top: 0;
			right: auto;
			width: var(--sidebar-w);
			grid-template-columns: none;
			grid-auto-rows: min-content;
			align-content: start;
			gap: 4px;
			padding: 24px 14px;
			border-top: none;
			border-right: 1px solid var(--line-faint);
		}

		.nav .brand {
			display: block !important;
			margin: 0 8px 24px;
			font-size: 16px;
			line-height: 1.4;
		}

		.nav a:not(.brand) {
			flex-direction: row;
			gap: 12px;
			padding: 10px 12px;
			font-size: 15px;
			border: 1px solid transparent;
		}

		.nav a.active:not(.brand) {
			border-color: var(--line-dim);
			background: rgba(164, 124, 255, 0.1);
		}

		.nav .profile {
			display: flex !important;
			margin-top: 24px;
			border-top: 1px solid var(--line-faint) !important;
			padding-top: 16px !important;
		}

		.content {
			max-width: none;
			padding: 28px 32px 48px calc(var(--sidebar-w) + 32px);
		}
	}
</style>
