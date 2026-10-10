<script lang="ts">
	import { ImageUp, Trash2 } from '@lucide/svelte';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { refresh } from '#lib/client/actions.ts';
	import { shrinkImage } from '#lib/client/image.ts';
	import { AVATAR_PRESETS, presetAvatarUrl } from '#lib/shared/constants.ts';
	import Avatar from '../Avatar.svelte';
	import Panel from '../Panel.svelte';

	let { name, color, avatarUrl }: { name: string; color: string; avatarUrl: string | null } = $props();

	let busy = $state(false);
	let error = $state('');

	async function run(task: () => Promise<unknown>) {
		busy = true;
		error = '';
		try {
			await task();
			await refresh();
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			busy = false;
		}
	}

	function choose(id: string) {
		void run(() => apiFetch('/api/me/avatar', { method: 'PUT', body: { preset: id } }));
	}

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		let image: Blob;
		try {
			image = await shrinkImage(file);
		} catch {
			error = 'Dieses Bild konnte nicht gelesen werden. Versuch ein JPG oder PNG.';
			return;
		}
		await run(() => apiFetch('/api/me/avatar', { method: 'POST', raw: image }));
	}
</script>

<Panel title="Profilbild">
	<div class="current">
		<Avatar {name} {color} src={avatarUrl} size={88} />
		<div class="actions">
			<label class="btn upload" class:disabled={busy}>
				<ImageUp size={18} /> Foto hochladen
				<input type="file" accept="image/*" disabled={busy} onchange={upload} />
			</label>
			{#if avatarUrl}
				<button class="btn btn-ghost" type="button" disabled={busy} onclick={() => run(() => apiFetch('/api/me/avatar', { method: 'DELETE' }))}>
					<Trash2 size={18} /> Bild entfernen
				</button>
			{/if}
		</div>
	</div>
	<p class="hint">Oder wähl einen Hunter. Ohne Bild zeigt die App deine Initialen.</p>
	<div class="presets" role="radiogroup" aria-label="Vorgefertigte Avatare">
		{#each AVATAR_PRESETS as preset (preset.id)}
			{@const url = presetAvatarUrl(preset.id)}
			<button
				type="button"
				class="preset"
				class:active={avatarUrl === url}
				role="radio"
				aria-checked={avatarUrl === url}
				aria-label={preset.name}
				title={preset.name}
				disabled={busy}
				onclick={() => choose(preset.id)}
			>
				<img src={url} alt="" width="64" height="64" loading="lazy" />
			</button>
		{/each}
	</div>
	{#if error}<p class="form-error" role="alert">{error}</p>{/if}
</Panel>

<style>
	.current {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.upload {
		position: relative;
		overflow: hidden;
	}

	.upload input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.upload:has(input:focus-visible) {
		outline: 2px solid var(--line);
	}

	.upload.disabled {
		opacity: 0.5;
	}

	.hint {
		margin: 14px 0 10px;
	}

	.presets {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
		max-width: 360px;
	}

	.preset {
		padding: 0;
		border: 2px solid transparent;
		border-radius: 50%;
		background: none;
		aspect-ratio: 1;
		cursor: pointer;
		transition:
			transform 0.1s,
			border-color 0.15s;
	}

	.preset img {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	.preset:hover {
		transform: scale(1.05);
	}

	.preset.active {
		border-color: var(--line);
		box-shadow: 0 0 14px var(--glow);
	}
</style>
