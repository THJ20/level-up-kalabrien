import { roundToUnit, type PlanUnit } from './plan';

/** Ein erkannter Planpunkt, noch ohne Zuordnung zum Katalog. */
export interface ImportedItem {
	name: string;
	target: number;
	unit: PlanUnit;
}

export interface ImportResult {
	items: ImportedItem[];
	/** Zeilen mit Inhalt, aus denen keine Übung erkannt wurde. */
	skipped: string[];
}

/** Prompt, den Spieler zusammen mit ihrem Plan an die eigene KI geben. */
export const PLAN_IMPORT_PROMPT = `Wandle meinen Trainingsplan in eine Liste für meine Fitness-App um.

Regeln:
- Die App kennt nur ein Tagesprogramm, das jeden Tag gleich ist. Unterscheidet mein Plan nach Tagen, fasse ihn zu einem sinnvollen täglichen Programm zusammen.
- Pro Übung genau eine Zeile im Format: Übung | Ziel | Einheit
- Einheit ist genau eines von: Wdh, Min, km
- Sätze rechnest du zusammen, z. B. wird 3 x 20 Kniebeugen zu 60 Wdh.
- Halteübungen und Zeitangaben gibst du in ganzen Minuten an, Sekunden rundest du auf.
- Höchstens 12 Übungen, kurze deutsche Übungsnamen.
- Gib nur den Codeblock aus, ohne Erklärung.

Beispiel:
\`\`\`
Liegestütze | 100 | Wdh
Plank | 3 | Min
Laufen | 5 | km
\`\`\`

Hier ist mein Plan:
`;

const UNIT_WORDS: { pattern: RegExp; unit: PlanUnit | 'seconds' | 'hours' | 'meters' }[] = [
	{ pattern: /^(wdh\.?|wiederholungen|wiederholung|reps?|rep\.?|x|mal|stück|stk\.?)$/i, unit: 'reps' },
	{ pattern: /^(min\.?|minuten|minute|minutes?|mins?)$/i, unit: 'minutes' },
	{ pattern: /^(sek\.?|sekunden|sekunde|sec\.?|seconds?|secs?|s)$/i, unit: 'seconds' },
	{ pattern: /^(std\.?|stunden|stunde|h|hours?)$/i, unit: 'hours' },
	{ pattern: /^(km|kilometer)$/i, unit: 'km' },
	{ pattern: /^(m|meter)$/i, unit: 'meters' }
];

type RawUnit = (typeof UNIT_WORDS)[number]['unit'];

function unitOf(word: string | undefined): RawUnit | null {
	if (!word) return null;
	const cleaned = word.trim().replace(/[()[\]:,]/g, '');
	return UNIT_WORDS.find((entry) => entry.pattern.test(cleaned))?.unit ?? null;
}

function toNumber(text: string): number {
	return Number(text.replace(',', '.'));
}

/** Rechnet Sekunden, Stunden und Meter in Planeinheiten um. */
function normalize(value: number, unit: RawUnit): { target: number; unit: PlanUnit } {
	switch (unit) {
		case 'seconds':
			return { target: Math.max(1, Math.ceil(value / 60)), unit: 'minutes' };
		case 'hours':
			return { target: Math.round(value * 60), unit: 'minutes' };
		case 'meters':
			return { target: roundToUnit('km', value / 1000), unit: 'km' };
		default:
			return { target: roundToUnit(unit, value), unit };
	}
}

function cleanName(name: string): string {
	return name
		.replace(/\*\*|__|`/g, '')
		.replace(/\((?:je|jeweils|pro|insgesamt|gesamt|total)[^)]*\)/gi, '')
		.replace(/\b(je|jeweils|à|insgesamt|gesamt|total|täglich|pro tag|am tag)\b/gi, '')
		.replace(/^[\s:.,;–-]+|[\s:.,;–-]+$/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function hasLetters(text: string): boolean {
	return /\p{L}/u.test(text);
}

/** Zeile im Format „Übung | Ziel | Einheit“ (auch mit ; oder Tab, oder als Markdown-Tabelle). */
function parseCells(cells: string[]): ImportedItem | null {
	const parts = cells.map((cell) => cell.trim()).filter((cell) => cell.length > 0);
	if (parts.length < 2) return null;
	const nameIndex = parts.findIndex((cell) => hasLetters(cell) && unitOf(cell) === null && !/^\d/.test(cell));
	if (nameIndex === -1) return null;
	const rest = parts.filter((_, index) => index !== nameIndex).join(' ');
	const quantity = parseQuantity(rest);
	if (!quantity) return null;
	const name = cleanName(parts[nameIndex]);
	return name ? { name, ...quantity } : null;
}

const SETS_TIMES = /(\d+)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*([\p{L}.]+)?/u;
const NUMBER_UNIT = /(\d+(?:[.,]\d+)?)\s*([\p{L}.]+)?/u;

function parseQuantity(text: string): { target: number; unit: PlanUnit } | null {
	const sets = SETS_TIMES.exec(text);
	if (sets) {
		const unit = unitOf(sets[3]) ?? 'reps';
		return normalize(Number(sets[1]) * toNumber(sets[2]), unit === 'reps' ? 'reps' : unit);
	}
	const match = NUMBER_UNIT.exec(text);
	if (!match) return null;
	const value = toNumber(match[1]);
	if (!(value > 0)) return null;
	const unit = unitOf(match[2]);
	if (unit === 'meters' && value < 100) return normalize(value, 'minutes');
	return normalize(value, unit ?? 'reps');
}

/** Freie Zeile wie „3x20 Kniebeugen“, „Plank 3 Min“ oder „100 Liegestütze“. */
function parseFree(line: string): ImportedItem | null {
	const sets = SETS_TIMES.exec(line);
	const single = sets ? null : NUMBER_UNIT.exec(line);
	const match = sets ?? single;
	if (!match) return null;
	const quantity = parseQuantity(match[0]);
	if (!quantity) return null;
	let removed = match[0];
	const trailing = sets ? sets[3] : single?.[2];
	if (trailing && unitOf(trailing) === null) removed = removed.slice(0, removed.length - trailing.length);
	const name = cleanName(line.replace(removed, ' '));
	return name && hasLetters(name) ? { name, ...quantity } : null;
}

function stripLine(line: string): string {
	return line
		.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '')
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.trim();
}

function isNoise(line: string): boolean {
	if (line.length === 0) return true;
	if (/^#/.test(line) || /^-{3,}|^:?-{2,}/.test(line.replace(/[|\s]/g, ''))) return true;
	return /^(übung|uebung|exercise|name)\s*[|;,\t]/i.test(line);
}

function fromJson(text: string): ImportedItem[] | null {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return null;
	}
	const list = Array.isArray(data)
		? data
		: data && typeof data === 'object'
			? (Object.values(data as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined)
			: undefined;
	if (!list) return null;
	const items: ImportedItem[] = [];
	for (const entry of list) {
		if (!entry || typeof entry !== 'object') continue;
		const record = Object.fromEntries(
			Object.entries(entry as Record<string, unknown>).map(([key, value]) => [key.toLowerCase(), value])
		);
		const name = [record.name, record.übung, record.uebung, record.exercise].find((value) => typeof value === 'string');
		const amount = [record.target, record.ziel, record.amount, record.menge, record.value, record.wert].find(
			(value) => typeof value === 'number' || (typeof value === 'string' && /\d/.test(value))
		);
		if (typeof name !== 'string' || amount === undefined) continue;
		const unitText = [record.unit, record.einheit].find((value) => typeof value === 'string') as string | undefined;
		const quantity = parseQuantity(`${amount} ${unitText ?? ''}`);
		if (quantity && cleanName(name)) items.push({ name: cleanName(name), ...quantity });
	}
	return items;
}

function codeBlocks(text: string): string | null {
	const blocks = [...text.matchAll(/```[\w-]*\n?([\s\S]*?)```/g)].map((match) => match[1]);
	return blocks.length > 0 ? blocks.join('\n') : null;
}

function mergeDuplicates(items: ImportedItem[]): ImportedItem[] {
	const merged = new Map<string, ImportedItem>();
	for (const item of items) {
		const key = `${normalizeName(item.name)}|${item.unit}`;
		const existing = merged.get(key);
		if (existing) existing.target = roundToUnit(item.unit, existing.target + item.target);
		else merged.set(key, { ...item });
	}
	return [...merged.values()];
}

/** Erkennt Planpunkte in eingefügtem Text: Prompt-Format, Markdown-Tabelle, CSV, JSON oder freie Zeilen. */
export function parsePlanText(input: string): ImportResult {
	const text = input.replace(/\r\n?/g, '\n').trim();
	if (!text) return { items: [], skipped: [] };
	const source = codeBlocks(text) ?? text;

	const json = fromJson(source.trim());
	if (json) return { items: mergeDuplicates(json), skipped: [] };

	const items: ImportedItem[] = [];
	const skipped: string[] = [];
	for (const raw of source.split('\n')) {
		const line = stripLine(raw);
		if (isNoise(line)) continue;
		let item: ImportedItem | null = null;
		if (/[|;\t]/.test(line)) item = parseCells(line.split(/[|;\t]/));
		else if (/^[^,]+,\s*\d+(?:[.,]\d+)?\s*(?:,\s*\S+)?$/.test(line)) item = parseCells(line.split(/,(?=\s*\d|\s*\p{L})/u));
		item ??= parseFree(line);
		if (item) items.push(item);
		else if (hasLetters(line)) skipped.push(line);
	}
	return { items: mergeDuplicates(items), skipped };
}

/** Vereinfachter Name zum Vergleichen: klein, ohne Umlaute, Satzzeichen und Leerzeichen. */
export function normalizeName(name: string): string {
	return name
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.replace(/[^a-z0-9]/g, '');
}

/** Gängige Schreibweisen, die auf einen Katalognamen zeigen. */
const SYNONYMS: Record<string, string[]> = {
	liegestuetze: ['liegestuetz', 'liegestuetzen', 'liegestutz', 'pushup', 'pushups', 'pressup', 'pressups'],
	kniebeugen: ['kniebeuge', 'squat', 'squats', 'airsquat', 'airsquats', 'bodyweightsquats'],
	crunches: ['crunch', 'situp', 'situps', 'bauchpresse', 'bauchpressen'],
	klimmzuege: ['klimmzug', 'pullup', 'pullups', 'chinup', 'chinups'],
	ausfallschritte: ['ausfallschritt', 'lunge', 'lunges'],
	burpees: ['burpee'],
	dips: ['dip'],
	laufen: ['joggen', 'running', 'run', 'lauf', 'jogging', 'dauerlauf'],
	radfahren: ['rad', 'fahrrad', 'cycling', 'radeln', 'bike'],
	seilspringen: ['springseil', 'jumprope', 'rope', 'seilhuepfen'],
	schwimmen: ['swimming', 'swim'],
	rudern: ['rowing', 'ruderergometer'],
	wandern: ['hiking', 'wanderung'],
	yoga: ['mobility', 'dehnen', 'stretching']
};

function stem(value: string): string {
	return value.replace(/(en|n|e|s)$/, '');
}

/** Ordnet einen erkannten Namen einer Katalogübung zu. Liefert die ID oder null. */
export function matchExercise(name: string, catalog: readonly { id: string; name: string }[]): string | null {
	const wanted = normalizeName(name);
	if (!wanted) return null;
	const candidates = new Set([wanted]);
	for (const [canonical, variants] of Object.entries(SYNONYMS)) {
		if (canonical === wanted || variants.includes(wanted)) {
			candidates.add(canonical);
			for (const variant of variants) candidates.add(variant);
		}
	}
	const keysOf = (entry: { name: string }) => [
		normalizeName(entry.name),
		...entry.name.split('/').map((part) => normalizeName(part))
	];
	for (const entry of catalog) {
		if (keysOf(entry).some((key) => candidates.has(key))) return entry.id;
	}
	const stems = new Set([...candidates].map(stem));
	for (const entry of catalog) {
		if (keysOf(entry).some((key) => stems.has(stem(key)))) return entry.id;
	}
	return null;
}
