<script lang="ts">
	import { Check, ClipboardCopy, FileUp, Share2, Sparkles, Wand } from '@lucide/svelte';
	import { MAX_PLAN_ITEMS, PLAN_IMPORT_PROMPT, UNIT_LABELS, parsePlanText } from '#lib/domain/index.ts';
	import { apiFetch, errorMessage } from '#lib/client/api.ts';
	import { decimal } from '#lib/client/format.ts';
	import Segmented from '../Segmented.svelte';
	import { rowsFromImport, type CatalogExercise, type DraftRow } from './draft';

	let { exercises, onApply }: { exercises: CatalogExercise[]; onApply: (rows: DraftRow[]) => void } = $props();

	const MAX_FILE_BYTES = 200_000;

	type Mode = 'coach' | 'convert';
	let mode = $state<Mode>('coach');
	let notes = $state('');
	let focus = $state(false);
	let coachText = $state('');
	let loadingPrompt = $state(false);
	let text = $state('');
	let copied = $state(false);
	let error = $state('');
	let preview = $state<{ rows: DraftRow[]; skipped: string[] } | null>(null);

	const prompt = $derived(mode === 'convert' ? PLAN_IMPORT_PROMPT : coachText);
	const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

	async function makePrompt() {
		loadingPrompt = true;
		error = '';
		try {
			coachText = (await apiFetch<{ prompt: string }>('/api/plan/prompt', { body: { notes, focus } })).prompt;
		} catch (caught) {
			error = errorMessage(caught);
		} finally {
			loadingPrompt = false;
		}
	}

	async function copyPrompt() {
		error = '';
		try {
			await navigator.clipboard.writeText(prompt);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			error = 'Kopieren geht hier nicht. Markier den Prompt im Feld und kopier ihn von Hand.';
		}
	}

	async function sharePrompt() {
		try {
			await navigator.share({ text: prompt });
		} catch {
			// Abgebrochen oder nicht möglich, dann bleibt Kopieren.
		}
	}

	async function readFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		error = '';
		if (/\.(pdf|png|jpe?g|heic|webp|docx?)$/i.test(file.name) || /^image\/|pdf|word/.test(file.type)) {
			error = 'PDFs, Fotos und Word-Dateien liest die App nicht selbst. Gib sie zusammen mit dem Prompt deiner KI und füg deren Antwort hier ein.';
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			error = 'Die Datei ist zu groß für einen Trainingsplan.';
			return;
		}
		text = await file.text();
		recognize();
	}

	function recognize() {
		error = '';
		const result = parsePlanText(text);
		if (result.items.length === 0) {
			preview = null;
			error = 'Darin habe ich keine Übungen erkannt. Am besten klappt das Format aus dem Prompt: Übung | Ziel | Einheit.';
			return;
		}
		preview = { rows: rowsFromImport(result.items, exercises), skipped: result.skipped };
	}

	function apply() {
		if (!preview) return;
		onApply(preview.rows);
		preview = null;
		text = '';
	}
</script>

<div class="mode">
	<Segmented
		label="Art des Prompts"
		bind:value={mode}
		options={[
			{ value: 'coach', label: 'Plan steigern lassen' },
			{ value: 'convert', label: 'Eigenen Plan umwandeln' }
		]}
	/>
</div>

<ol class="steps">
	<li>
		{#if mode === 'coach'}
			<p>
				<b>Prompt erzeugen.</b> Er enthält deinen aktuellen Plan, deine Bewertung und deine letzten zwei Wochen.
				Die KI macht daraus einen fordernderen Plan für 15 bis 30 Minuten am Tag, ohne Geräte.
			</p>
			<label class="field">
				<span>Hinweise an die KI (optional)</span>
				<input class="input" maxlength="500" placeholder="z. B. Knie schonen, mehr Rumpf" bind:value={notes} />
			</label>
			<label class="focus">
				<input type="checkbox" bind:checked={focus} /> Fokus auf neue Muskelgruppen (1 bis 2 Übungen tauschen)
			</label>
			<button class="btn" type="button" disabled={loadingPrompt} onclick={makePrompt}>
				<Wand size={18} /> {coachText ? 'Prompt neu erzeugen' : 'Prompt erzeugen'}
			</button>
		{:else}
			<p><b>Prompt nehmen.</b> Er wandelt einen Plan, den du schon hast, ins Format der App um.</p>
		{/if}
		{#if prompt}
			<label class="field prompt">
				<span class="visually-hidden">Prompt</span>
				<textarea class="input" rows="8" readonly value={prompt} onfocus={(event) => event.currentTarget.select()}></textarea>
			</label>
			<div class="actions">
				<button class="btn btn-primary" type="button" onclick={copyPrompt}>
					{#if copied}<Check size={18} /> Kopiert{:else}<ClipboardCopy size={18} /> Kopieren{/if}
				</button>
				{#if canShare}
					<button class="btn" type="button" onclick={sharePrompt}><Share2 size={18} /> An KI-App senden</button>
				{/if}
			</div>
		{/if}
	</li>
	<li>
		<p>
			<b>Bei deiner KI einfügen</b>, zum Beispiel Claude oder ChatGPT.
			{#if mode === 'convert'}Gib deinen Plan dazu, als Datei, Foto oder Text.{/if}
		</p>
	</li>
	<li>
		<p><b>Antwort hier einfügen</b> oder als Textdatei hochladen (.txt, .md, .csv, .json).</p>
		<label class="field">
			<span class="visually-hidden">Antwort der KI</span>
			<textarea
				class="input"
				rows="6"
				placeholder={'Liegestütze | 100 | Wdh\nPlank | 3 | Min\nLaufen | 5 | km'}
				bind:value={text}
			></textarea>
		</label>
		<div class="actions">
			<button class="btn btn-primary" type="button" disabled={!text.trim()} onclick={recognize}>
				<Wand size={18} /> Erkennen
			</button>
			<label class="btn file">
				<FileUp size={18} /> Datei wählen
				<input type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" onchange={readFile} />
			</label>
		</div>
	</li>
</ol>

{#if error}<p class="form-error" role="alert">{error}</p>{/if}

{#if preview}
	<div class="preview" aria-live="polite">
		<p class="sys head">Erkannt: {preview.rows.length} {preview.rows.length === 1 ? 'Übung' : 'Übungen'}</p>
		<ul>
			{#each preview.rows as row (row.key)}
				<li>
					<span class="name">{row.name}</span>
					{#if row.newExercise}<span class="new"><Sparkles size={13} /> wird neu angelegt</span>{/if}
					<span class="num value">{decimal(row.target)} {UNIT_LABELS[row.unit].short}</span>
				</li>
			{/each}
		</ul>
		{#if preview.skipped.length > 0}
			<details class="skipped">
				<summary>{preview.skipped.length} Zeilen nicht erkannt</summary>
				<ul>
					{#each preview.skipped as line, index (index)}<li>{line}</li>{/each}
				</ul>
			</details>
		{/if}
		{#if preview.rows.length > MAX_PLAN_ITEMS}
			<p class="form-error">
				Das sind mehr als {MAX_PLAN_ITEMS} Übungen. Entferne im Editor die überzähligen oder lass dir den Plan neu
				erzeugen.
			</p>
		{/if}
		<p class="hint">Im Editor oben kannst du danach noch alles anpassen, bevor du speicherst.</p>
		<div class="actions">
			<button class="btn btn-primary" type="button" onclick={apply}>In den Editor übernehmen</button>
			<button class="btn btn-ghost" type="button" onclick={() => (preview = null)}>Verwerfen</button>
		</div>
	</div>
{/if}

<style>
	.steps {
		margin: 0;
		padding-left: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.steps li::marker {
		font-family: var(--f-sys);
		color: var(--line);
	}

	.steps p {
		margin-bottom: 8px;
		font-size: 15px;
	}

	.mode {
		margin-bottom: 14px;
	}

	.focus {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
		font-size: 14px;
	}

	.focus input {
		width: 18px;
		height: 18px;
		accent-color: var(--line);
	}

	.prompt {
		margin-top: 10px;
	}

	.prompt textarea {
		font-family: var(--f-body);
		font-size: 13px;
		color: var(--dim);
	}

	.focus + .btn {
		margin-top: 8px;
	}

	textarea {
		resize: vertical;
		font-family: var(--f-sys);
		font-size: 14px;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}

	.file {
		position: relative;
		overflow: hidden;
	}

	.file input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.file:has(input:focus-visible) {
		outline: 2px solid var(--line);
	}

	.preview {
		margin-top: 16px;
		padding: 12px;
		border: 1px solid var(--line-dim);
		background: rgba(var(--accent-rgb), 0.05);
	}

	.head {
		font-size: 13px;
		color: var(--accent-text);
		margin-bottom: 8px;
	}

	.preview ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.preview li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px 10px;
		padding: 6px 0;
		border-top: 1px solid var(--line-faint);
	}

	.preview li:first-child {
		border-top: none;
	}

	.name {
		flex: 1;
		min-width: 120px;
		font-weight: 600;
	}

	.value {
		color: var(--text);
	}

	.new {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		color: var(--gold);
		font-size: 12px;
	}

	.skipped {
		margin-top: 8px;
		font-size: 13px;
		color: var(--muted);
	}

	.skipped summary {
		cursor: pointer;
	}

	.hint {
		margin-top: 8px;
	}
</style>
