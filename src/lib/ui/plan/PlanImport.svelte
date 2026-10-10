<script lang="ts">
	import { Check, ClipboardCopy, FileUp, Sparkles, Wand } from '@lucide/svelte';
	import { PLAN_IMPORT_PROMPT, UNIT_LABELS, parsePlanText } from '#lib/domain/index.ts';
	import { decimal } from '#lib/client/format.ts';
	import { rowsFromImport, type CatalogExercise, type DraftRow } from './draft';

	let { exercises, onApply }: { exercises: CatalogExercise[]; onApply: (rows: DraftRow[]) => void } = $props();

	const MAX_FILE_BYTES = 200_000;

	let text = $state('');
	let copied = $state(false);
	let error = $state('');
	let preview = $state<{ rows: DraftRow[]; skipped: string[] } | null>(null);

	async function copyPrompt() {
		error = '';
		try {
			await navigator.clipboard.writeText(PLAN_IMPORT_PROMPT);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			error = 'Kopieren hat nicht geklappt. Markier den Prompt unten und kopier ihn von Hand.';
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

<ol class="steps">
	<li>
		<p><b>Prompt kopieren.</b> Er sagt deiner KI, in welchem Format sie deinen Plan liefern soll.</p>
		<button class="btn" type="button" onclick={copyPrompt}>
			{#if copied}<Check size={18} /> Kopiert{:else}<ClipboardCopy size={18} /> Prompt kopieren{/if}
		</button>
		<details class="prompt">
			<summary>Prompt ansehen</summary>
			<pre>{PLAN_IMPORT_PROMPT}</pre>
		</details>
	</li>
	<li>
		<p>
			<b>Bei deiner KI einfügen</b>, zum Beispiel Claude oder ChatGPT, und deinen Plan dazugeben: als Datei, Foto
			oder Text.
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

	.prompt {
		margin-top: 8px;
		font-size: 14px;
		color: var(--dim);
	}

	.prompt summary {
		cursor: pointer;
	}

	pre {
		margin: 8px 0 0;
		padding: 10px;
		max-height: 260px;
		overflow: auto;
		white-space: pre-wrap;
		border: 1px solid var(--line-faint);
		background: rgba(var(--deep-rgb), 0.6);
		font-size: 13px;
		color: var(--text);
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
