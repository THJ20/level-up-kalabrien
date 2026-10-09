# Plan 1 · Fundament und Spielregeln · Implementation Plan

> **Umsetzung:** Task für Task abarbeiten. Die Schritte sind als Checkboxen (`- [ ]`) notiert.

**Goal:** Projektgerüst anlegen und alle Spielregeln der Spezifikation als reine, vollständig getestete TypeScript-Funktionen umsetzen.

**Architecture:** SvelteKit-Projekt mit adapter-node. Die Spielregeln liegen in `src/lib/domain/` als reines Modul ohne Datenbank, ohne SvelteKit-Importe und ohne Zugriff auf die aktuelle Uhrzeit. „Heute“ und „jetzt“ werden immer als Parameter übergeben. Tagesstatus, XP, Level, Rang, Streak und Badges werden aus Rohdaten (Sätze, Krankmeldungen, Bonus-Einträge) abgeleitet. Plan 2 bindet das Modul an Datenbank und Server an.

**Tech Stack:** Node.js ≥ 24, SvelteKit 2, Svelte 5, TypeScript (strict), Vite, Vitest. Zeitzonen über das eingebaute `Intl` (keine Zusatzbibliothek).

**Spezifikation:** `docs/specs/2026-10-09-level-up-kalabrien-design.md`

## Global Constraints

- Node.js ≥ 24, TypeScript `strict: true`.
- Zeitzone für alle Tagesgrenzen: `Europe/Berlin`.
- Challenge: Tag 1 = `2026-10-09`, Tag 202 = `2027-04-28`, Abflug = `2027-04-29`.
- Daily Quest: je 100 Wiederholungen für `pushups`, `squats`, `situps`.
- Level: `q(L) = 195 × ((L − 1) / 49) ^ 1,6`, Level 1 bis 51, 100 XP pro erfülltem Tag. Ränge E (1–9), D (10–19), C (20–29), B (30–39), A (40–49), S (50–51).
- BP: Zeit `Minuten × Faktor`, Wiederholungen `Wdh × Sek/Wdh ÷ 60 × Faktor`, Faktoren locker 3, moderat 5, hart 7, am Limit 9. Extra-Wiederholungen über 100: 3 Sek/Wdh, Stufe hart.
- Das Domänenmodul `src/lib/domain/` importiert nichts aus `$app`, `@sveltejs/kit`, Datenbank oder Netzwerk und ruft nie `Date.now()` oder `new Date()` ohne Argument auf.
- Bezeichner im Code englisch, Testbeschreibungen und Oberflächentexte deutsch, System-Meldungen englisch.
- Keine Namen, Logos, Figuren oder Grafiken aus Solo Leveling.
- Zeilenenden LF (über `.gitattributes`).
- Befehle sind für PowerShell geschrieben, Arbeitsverzeichnis ist `C:\Users\TobiasHeinze\Documents\level-up-kalabrien`.
- Jede Commit-Nachricht endet mit einem eigenen Absatz `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (zweites `-m`).

## Glossar Spezifikation → Code

| Spezifikation | Code |
|---|---|
| Hunter | `hunter` |
| Challenge-Tag | `LocalDate` (`'JJJJ-MM-TT'`), `dayNumber` |
| Pflichtübung | `Exercise` (`'pushups' \| 'squats' \| 'situps'`) |
| Satz | `QuestSet` |
| Krankmeldung | `SickNote` |
| Bonus-Eintrag | `BonusEntry` |
| Tagesstatus erfüllt / krank / offen / nicht gewertet / verpasst | `DayStatus` `'fulfilled' \| 'sick' \| 'open' \| 'unscored' \| 'missed'` |
| Wertungsbeginn | `scoringStart` |
| Nachtrag | `backfilled` |
| Stufe locker / moderat / hart / am Limit | `Effort` `'easy' \| 'moderate' \| 'hard' \| 'max'` |
| Bonuspunkte | `bonusPoints`, Extra-Wiederholungen `overtimePoints` |
| Verpasst-Ereignis | `missed day` (Abgleich über `reconcileMissedDays`) |
| Stimme | `Ballot` |
| Strafbuch-Eintrag (verhängt) | `verdict` |

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.gitattributes`, `.npmrc` | Projektgerüst |
| `src/app.html`, `src/app.d.ts`, `src/routes/+page.svelte` | Minimale SvelteKit-App |
| `src/lib/domain/challenge.ts` | Kalender, Challenge-Daten, Umrechnung Zeitpunkt ↔ Berliner Kalendertag |
| `src/lib/domain/quest.ts` | Pflichtübungen, Sätze, Summen, Quest erfüllt, Abschlusszeitpunkt |
| `src/lib/domain/bonus.ts` | Stufen und BP-Formeln |
| `src/lib/domain/timeline.ts` | Tagesstatus und Tagesübersicht eines Hunters über die ganze Challenge |
| `src/lib/domain/streak.ts` | Aktueller und längster Streak |
| `src/lib/domain/level.ts` | Level-Kurve, XP, Rang |
| `src/lib/domain/badges.ts` | Badge-Katalog und Bedingungen |
| `src/lib/domain/votes.ts` | Auszählung einer Abstimmung, Stimmberechtigte |
| `src/lib/domain/reconcile.ts` | Abgleich: welche verpassten Tage neu entstehen, welche aufgehoben werden |
| `src/lib/domain/test-helpers.ts` | Gemeinsame Test-Helfer für Tagesübersichten |
| `src/lib/domain/index.ts` | Öffentliche Schnittstelle des Moduls |
| `src/lib/domain/README.md` | Kurzbeschreibung und Glossar |
| `src/lib/domain/*.test.ts` | Tests je Datei |

---

### Task 1: Projektgerüst

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.gitattributes`, `.npmrc`, `src/app.html`, `src/app.d.ts`, `src/routes/+page.svelte`

**Interfaces:**
- Consumes: nichts
- Produces: lauffähiges SvelteKit-Projekt, `npm test` (Vitest, Muster `src/**/*.test.ts`), `npm run check` (svelte-check), `npm run build`

- [ ] **Step 1: Feature-Branch anlegen**

```powershell
git switch -c feat/fundament-spielregeln
```

- [ ] **Step 2: `package.json` anlegen**

```json
{
	"name": "level-up-kalabrien",
	"private": true,
	"version": "0.1.0",
	"type": "module",
	"engines": {
		"node": ">=24"
	},
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "vite preview",
		"prepare": "svelte-kit sync || echo ''",
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"test": "vitest run",
		"test:watch": "vitest"
	}
}
```

- [ ] **Step 3: Konfigurationsdateien anlegen**

`svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};

export default config;
```

`vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

`tsconfig.json`:

```json
{
	"extends": "./.svelte-kit/tsconfig.json",
	"compilerOptions": {
		"allowJs": true,
		"checkJs": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"strict": true,
		"moduleResolution": "bundler"
	}
}
```

`.gitignore`:

```gitignore
node_modules
.svelte-kit
build
.env
.env.*
!.env.example
/data
test-results
playwright-report
```

`.gitattributes`:

```gitattributes
* text=auto eol=lf
*.png binary
*.woff2 binary
```

`.npmrc`:

```ini
engine-strict=true
```

- [ ] **Step 4: Minimale App-Dateien anlegen**

`src/app.html`:

```html
<!doctype html>
<html lang="de">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

`src/app.d.ts`:

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
```

`src/routes/+page.svelte`:

```svelte
<svelte:head>
	<title>Level Up · Kalabrien</title>
</svelte:head>

<h1>Level Up · Kalabrien</h1>
```

- [ ] **Step 5: Abhängigkeiten installieren**

```powershell
npm install -D @sveltejs/kit @sveltejs/adapter-node @sveltejs/vite-plugin-svelte svelte vite typescript svelte-check vitest @types/node
```

Expected: Installation ohne `ERESOLVE`-Fehler, `package.json` enthält die Pakete unter `devDependencies`, `.svelte-kit/` wurde durch `prepare` erzeugt.

- [ ] **Step 6: Gerüst prüfen**

```powershell
npm run check
npm run build
npx vitest run --passWithNoTests
```

Expected: `svelte-check found 0 errors and 0 warnings`, Build endet mit `✔ done`, Vitest meldet `No test files found, exiting with code 0`.

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json svelte.config.js vite.config.ts tsconfig.json .gitignore .gitattributes .npmrc src
git commit -m "chore: SvelteKit-Projektgerüst mit Vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kalender und Zeitzone

**Files:**
- Create: `src/lib/domain/challenge.ts`
- Test: `src/lib/domain/challenge.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type LocalDate = string`
  - Konstanten `TIME_ZONE`, `CHALLENGE_START`, `CHALLENGE_END`, `DEPARTURE`, `CHALLENGE_DAYS`
  - `isLocalDate(value: string): boolean`
  - `addDays(date: LocalDate, days: number): LocalDate`
  - `daysBetween(from: LocalDate, to: LocalDate): number`
  - `challengeDayNumber(date: LocalDate): number | null`
  - `challengeDays(): LocalDate[]`
  - `daysUntilDeparture(today: LocalDate): number`
  - `localDateOf(instant: Date): LocalDate`
  - `minutesOfDay(instant: Date): number`
  - `startOfDay(date: LocalDate): Date`
  - `endOfDay(date: LocalDate): Date`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/challenge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	CHALLENGE_END,
	addDays,
	challengeDayNumber,
	challengeDays,
	daysBetween,
	daysUntilDeparture,
	endOfDay,
	isLocalDate,
	localDateOf,
	minutesOfDay,
	startOfDay
} from './challenge';

describe('Kalender', () => {
	it('kennt Start, Ende und Länge der Challenge', () => {
		expect(challengeDayNumber('2026-10-09')).toBe(1);
		expect(challengeDayNumber(CHALLENGE_END)).toBe(202);
		expect(challengeDayNumber('2026-10-08')).toBeNull();
		expect(challengeDayNumber('2027-04-29')).toBeNull();
		const days = challengeDays();
		expect(days).toHaveLength(202);
		expect(days[0]).toBe('2026-10-09');
		expect(days[201]).toBe('2027-04-28');
	});

	it('zählt die Tage bis zum Abflug', () => {
		expect(daysUntilDeparture('2026-10-09')).toBe(202);
		expect(daysUntilDeparture('2027-04-28')).toBe(1);
		expect(daysUntilDeparture('2027-05-01')).toBe(0);
	});

	it('rechnet über Monats- und Jahresgrenzen', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
		expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
	});

	it('prüft das Datumsformat', () => {
		expect(isLocalDate('2026-10-09')).toBe(true);
		expect(isLocalDate('2026-02-30')).toBe(false);
		expect(isLocalDate('09.10.2026')).toBe(false);
	});
});

describe('Zeitzone Europe/Berlin', () => {
	it('ordnet Zeitpunkte dem deutschen Kalendertag zu', () => {
		expect(localDateOf(new Date('2026-10-09T21:59:59Z'))).toBe('2026-10-09');
		expect(localDateOf(new Date('2026-10-09T22:00:00Z'))).toBe('2026-10-10');
		expect(localDateOf(new Date('2026-12-01T22:59:59Z'))).toBe('2026-12-01');
		expect(localDateOf(new Date('2026-12-01T23:00:00Z'))).toBe('2026-12-02');
	});

	it('liefert Mitternacht in Sommer- und Winterzeit', () => {
		expect(startOfDay('2026-10-10').toISOString()).toBe('2026-10-09T22:00:00.000Z');
		expect(startOfDay('2026-12-02').toISOString()).toBe('2026-12-01T23:00:00.000Z');
	});

	it('übersteht die Umstellung auf Winterzeit am 25.10.2026', () => {
		expect(startOfDay('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
		expect(endOfDay('2026-10-25').toISOString()).toBe('2026-10-25T23:00:00.000Z');
		expect(endOfDay('2026-10-25').getTime() - startOfDay('2026-10-25').getTime()).toBe(
			25 * 3_600_000
		);
	});

	it('übersteht die Umstellung auf Sommerzeit am 28.03.2027', () => {
		expect(startOfDay('2027-03-28').toISOString()).toBe('2027-03-27T23:00:00.000Z');
		expect(endOfDay('2027-03-28').toISOString()).toBe('2027-03-28T22:00:00.000Z');
		expect(endOfDay('2027-03-28').getTime() - startOfDay('2027-03-28').getTime()).toBe(
			23 * 3_600_000
		);
	});

	it('liefert die Uhrzeit in Minuten seit Mitternacht', () => {
		expect(minutesOfDay(new Date('2026-10-09T05:59:00Z'))).toBe(7 * 60 + 59);
		expect(minutesOfDay(new Date('2026-12-01T22:30:00Z'))).toBe(23 * 60 + 30);
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/challenge.test.ts`
Expected: FAIL mit `Failed to resolve import "./challenge"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/challenge.ts`:

```ts
/** Kalendertag in Europe/Berlin im Format JJJJ-MM-TT. */
export type LocalDate = string;

export const TIME_ZONE = 'Europe/Berlin';
export const CHALLENGE_START: LocalDate = '2026-10-09';
export const CHALLENGE_END: LocalDate = '2027-04-28';
export const DEPARTURE: LocalDate = '2027-04-29';
export const CHALLENGE_DAYS = 202;

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value);
	if (!match) return false;
	const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
	return utc.toISOString().slice(0, 10) === value;
}

function toUtcMs(date: LocalDate): number {
	const [year, month, day] = date.split('-').map(Number);
	return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): LocalDate {
	return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDate, days: number): LocalDate {
	return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
	return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function challengeDayNumber(date: LocalDate): number | null {
	const dayNumber = daysBetween(CHALLENGE_START, date) + 1;
	return dayNumber >= 1 && dayNumber <= CHALLENGE_DAYS ? dayNumber : null;
}

export function challengeDays(): LocalDate[] {
	return Array.from({ length: CHALLENGE_DAYS }, (_, index) => addDays(CHALLENGE_START, index));
}

export function daysUntilDeparture(today: LocalDate): number {
	return Math.max(0, daysBetween(today, DEPARTURE));
}

const berlinFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hourCycle: 'h23'
});

interface BerlinParts {
	date: LocalDate;
	hour: number;
	minute: number;
	second: number;
}

function berlinParts(instant: Date): BerlinParts {
	const parts: Record<string, string> = {};
	for (const part of berlinFormatter.formatToParts(instant)) parts[part.type] = part.value;
	return {
		date: `${parts.year}-${parts.month}-${parts.day}`,
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second)
	};
}

export function localDateOf(instant: Date): LocalDate {
	return berlinParts(instant).date;
}

export function minutesOfDay(instant: Date): number {
	const parts = berlinParts(instant);
	return parts.hour * 60 + parts.minute;
}

function berlinOffsetMs(instant: Date): number {
	const parts = berlinParts(instant);
	const wallClockAsUtc =
		toUtcMs(parts.date) + ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000;
	return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Zeitpunkt, an dem der Kalendertag in Berlin beginnt (00:00 Uhr Ortszeit). */
export function startOfDay(date: LocalDate): Date {
	const midnightAsUtc = toUtcMs(date);
	let instant = midnightAsUtc - berlinOffsetMs(new Date(midnightAsUtc));
	instant = midnightAsUtc - berlinOffsetMs(new Date(instant));
	return new Date(instant);
}

/** Zeitpunkt, an dem der Kalendertag in Berlin endet (Beginn des Folgetags). */
export function endOfDay(date: LocalDate): Date {
	return startOfDay(addDays(date, 1));
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/challenge.test.ts`
Expected: PASS, 9 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/challenge.ts src/lib/domain/challenge.test.ts
git commit -m "feat(domain): Challenge-Kalender mit Berliner Tagesgrenzen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Daily Quest

**Files:**
- Create: `src/lib/domain/quest.ts`
- Test: `src/lib/domain/quest.test.ts`

**Interfaces:**
- Consumes: `LocalDate` aus `challenge.ts`
- Produces:
  - `const EXERCISES: readonly ['pushups', 'squats', 'situps']`, `type Exercise`
  - `const EXERCISE_LABELS: Record<Exercise, string>`
  - `const QUEST_TARGET = 100`, `const MAX_REPS_PER_SET = 500`
  - `interface QuestSet { id: string; date: LocalDate; exercise: Exercise; reps: number; recordedAt: Date }`
  - `type ExerciseTotals = Record<Exercise, number>`
  - `isValidSetReps(reps: number): boolean`
  - `emptyTotals(): ExerciseTotals`
  - `totalsOf(sets: readonly QuestSet[]): ExerciseTotals`
  - `isQuestComplete(totals: ExerciseTotals): boolean`
  - `completionTime(setsOfDay: readonly QuestSet[]): Date | null`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/quest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	completionTime,
	isQuestComplete,
	isValidSetReps,
	totalsOf,
	type Exercise,
	type QuestSet
} from './quest';

let sequence = 0;
function set(exercise: Exercise, reps: number, recordedAtIso: string): QuestSet {
	sequence += 1;
	return {
		id: `set-${sequence}`,
		date: '2026-10-09',
		exercise,
		reps,
		recordedAt: new Date(recordedAtIso)
	};
}

describe('Daily Quest', () => {
	it('summiert Sätze je Übung', () => {
		const totals = totalsOf([
			set('pushups', 40, '2026-10-09T06:00:00Z'),
			set('pushups', 60, '2026-10-09T07:00:00Z'),
			set('squats', 25, '2026-10-09T08:00:00Z')
		]);
		expect(totals).toEqual({ pushups: 100, squats: 25, situps: 0 });
	});

	it('ist erst erfüllt, wenn jede Übung 100 erreicht', () => {
		expect(isQuestComplete({ pushups: 100, squats: 100, situps: 99 })).toBe(false);
		expect(isQuestComplete({ pushups: 100, squats: 150, situps: 100 })).toBe(true);
	});

	it('findet den Satz, der die Quest abschließt, auch bei ungeordneter Eingabe', () => {
		const sets = [
			set('situps', 100, '2026-10-09T18:00:00Z'),
			set('pushups', 100, '2026-10-09T06:00:00Z'),
			set('squats', 50, '2026-10-09T07:00:00Z'),
			set('squats', 50, '2026-10-09T12:00:00Z')
		];
		expect(completionTime(sets)?.toISOString()).toBe('2026-10-09T18:00:00.000Z');
	});

	it('liefert keinen Abschlusszeitpunkt für eine offene Quest', () => {
		expect(completionTime([set('pushups', 100, '2026-10-09T06:00:00Z')])).toBeNull();
	});

	it('akzeptiert 1 bis 500 ganze Wiederholungen pro Satz', () => {
		expect(isValidSetReps(1)).toBe(true);
		expect(isValidSetReps(500)).toBe(true);
		expect(isValidSetReps(0)).toBe(false);
		expect(isValidSetReps(501)).toBe(false);
		expect(isValidSetReps(10.5)).toBe(false);
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/quest.test.ts`
Expected: FAIL mit `Failed to resolve import "./quest"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/quest.ts`:

```ts
import type { LocalDate } from './challenge';

export const EXERCISES = ['pushups', 'squats', 'situps'] as const;
export type Exercise = (typeof EXERCISES)[number];

export const EXERCISE_LABELS: Record<Exercise, string> = {
	pushups: 'PUSH-UPS',
	squats: 'SQUATS',
	situps: 'SIT-UPS'
};

export const QUEST_TARGET = 100;
export const MAX_REPS_PER_SET = 500;

export interface QuestSet {
	id: string;
	date: LocalDate;
	exercise: Exercise;
	reps: number;
	recordedAt: Date;
}

export type ExerciseTotals = Record<Exercise, number>;

export function isValidSetReps(reps: number): boolean {
	return Number.isInteger(reps) && reps >= 1 && reps <= MAX_REPS_PER_SET;
}

export function emptyTotals(): ExerciseTotals {
	return { pushups: 0, squats: 0, situps: 0 };
}

export function totalsOf(sets: readonly QuestSet[]): ExerciseTotals {
	const totals = emptyTotals();
	for (const entry of sets) totals[entry.exercise] += entry.reps;
	return totals;
}

export function isQuestComplete(totals: ExerciseTotals): boolean {
	return EXERCISES.every((exercise) => totals[exercise] >= QUEST_TARGET);
}

/** Erfassungszeitpunkt des Satzes, mit dem die Daily Quest eines Tages erfüllt wurde. */
export function completionTime(setsOfDay: readonly QuestSet[]): Date | null {
	const ordered = [...setsOfDay].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
	const totals = emptyTotals();
	for (const entry of ordered) {
		totals[entry.exercise] += entry.reps;
		if (isQuestComplete(totals)) return entry.recordedAt;
	}
	return null;
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/quest.test.ts`
Expected: PASS, 5 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/quest.ts src/lib/domain/quest.test.ts
git commit -m "feat(domain): Daily Quest mit Summen und Abschlusszeitpunkt" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Bonuspunkte

**Files:**
- Create: `src/lib/domain/bonus.ts`
- Test: `src/lib/domain/bonus.test.ts`

**Interfaces:**
- Consumes: `EXERCISES`, `QUEST_TARGET`, `ExerciseTotals` aus `quest.ts`
- Produces:
  - `const EFFORTS: readonly ['easy', 'moderate', 'hard', 'max']`, `type Effort`
  - `const EFFORT_FACTOR: Record<Effort, number>`, `const EFFORT_LABELS: Record<Effort, string>`
  - Konstanten `OVERTIME_SECONDS_PER_REP = 3`, `OVERTIME_EFFORT = 'hard'`, `MAX_MINUTES = 600`, `MAX_BONUS_REPS = 1000`, `MIN_SECONDS_PER_REP = 2`, `MAX_SECONDS_PER_REP = 10`
  - `isValidMinutes(minutes: number): boolean`
  - `isValidBonusReps(reps: number): boolean`
  - `isValidSecondsPerRep(seconds: number): boolean`
  - `timeBonusPoints(minutes: number, effort: Effort): number`
  - `repsBonusPoints(reps: number, secondsPerRep: number, effort: Effort): number`
  - `overtimeBonusPoints(totals: ExerciseTotals): number`
  - `displayPoints(points: number): number`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/bonus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	displayPoints,
	isValidBonusReps,
	isValidMinutes,
	isValidSecondsPerRep,
	overtimeBonusPoints,
	repsBonusPoints,
	timeBonusPoints
} from './bonus';

describe('Bonuspunkte nach Anstrengung', () => {
	it('rechnet Zeit-Übungen als Minuten mal Stufe', () => {
		expect(timeBonusPoints(60, 'hard')).toBe(420);
		expect(timeBonusPoints(30, 'moderate')).toBe(150);
		expect(timeBonusPoints(20, 'max')).toBe(180);
		expect(timeBonusPoints(40, 'easy')).toBe(120);
	});

	it('rechnet Wiederholungs-Übungen über die Dauer pro Wiederholung', () => {
		expect(repsBonusPoints(50, 3, 'hard')).toBe(17.5);
		expect(repsBonusPoints(20, 4, 'max')).toBe(12);
	});

	it('wertet nur Wiederholungen über 100 als Overtime', () => {
		expect(overtimeBonusPoints({ pushups: 150, squats: 100, situps: 90 })).toBe(17.5);
		expect(overtimeBonusPoints({ pushups: 120, squats: 130, situps: 100 })).toBe(17.5);
		expect(overtimeBonusPoints({ pushups: 100, squats: 100, situps: 100 })).toBe(0);
	});

	it('rundet für die Anzeige auf ganze Punkte', () => {
		expect(displayPoints(17.5)).toBe(18);
		expect(displayPoints(17.4)).toBe(17);
	});

	it('prüft die Eingabegrenzen', () => {
		expect(isValidMinutes(1)).toBe(true);
		expect(isValidMinutes(600)).toBe(true);
		expect(isValidMinutes(0)).toBe(false);
		expect(isValidMinutes(601)).toBe(false);
		expect(isValidMinutes(12.5)).toBe(false);
		expect(isValidBonusReps(1000)).toBe(true);
		expect(isValidBonusReps(1001)).toBe(false);
		expect(isValidSecondsPerRep(2)).toBe(true);
		expect(isValidSecondsPerRep(10)).toBe(true);
		expect(isValidSecondsPerRep(1)).toBe(false);
		expect(isValidSecondsPerRep(11)).toBe(false);
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/bonus.test.ts`
Expected: FAIL mit `Failed to resolve import "./bonus"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/bonus.ts`:

```ts
import { EXERCISES, QUEST_TARGET, type ExerciseTotals } from './quest';

export const EFFORTS = ['easy', 'moderate', 'hard', 'max'] as const;
export type Effort = (typeof EFFORTS)[number];

/** Stufenfaktoren nach Session-RPE (Foster): Trainingslast = Dauer × Anstrengung. */
export const EFFORT_FACTOR: Record<Effort, number> = { easy: 3, moderate: 5, hard: 7, max: 9 };

export const EFFORT_LABELS: Record<Effort, string> = {
	easy: 'locker',
	moderate: 'moderat',
	hard: 'hart',
	max: 'am Limit'
};

export const OVERTIME_SECONDS_PER_REP = 3;
export const OVERTIME_EFFORT: Effort = 'hard';
export const MAX_MINUTES = 600;
export const MAX_BONUS_REPS = 1000;
export const MIN_SECONDS_PER_REP = 2;
export const MAX_SECONDS_PER_REP = 10;

function isIntegerBetween(value: number, min: number, max: number): boolean {
	return Number.isInteger(value) && value >= min && value <= max;
}

export function isValidMinutes(minutes: number): boolean {
	return isIntegerBetween(minutes, 1, MAX_MINUTES);
}

export function isValidBonusReps(reps: number): boolean {
	return isIntegerBetween(reps, 1, MAX_BONUS_REPS);
}

export function isValidSecondsPerRep(seconds: number): boolean {
	return isIntegerBetween(seconds, MIN_SECONDS_PER_REP, MAX_SECONDS_PER_REP);
}

export function timeBonusPoints(minutes: number, effort: Effort): number {
	return minutes * EFFORT_FACTOR[effort];
}

export function repsBonusPoints(reps: number, secondsPerRep: number, effort: Effort): number {
	return (reps * secondsPerRep * EFFORT_FACTOR[effort]) / 60;
}

/** BP für Wiederholungen über dem Pflichtpensum eines Tages. */
export function overtimeBonusPoints(totals: ExerciseTotals): number {
	return EXERCISES.reduce((sum, exercise) => {
		const extraReps = Math.max(0, totals[exercise] - QUEST_TARGET);
		return sum + repsBonusPoints(extraReps, OVERTIME_SECONDS_PER_REP, OVERTIME_EFFORT);
	}, 0);
}

export function displayPoints(points: number): number {
	return Math.round(points);
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/bonus.test.ts`
Expected: PASS, 5 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/bonus.ts src/lib/domain/bonus.test.ts
git commit -m "feat(domain): Bonuspunkte nach Anstrengungsstufe" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Tagesstatus und Tagesübersicht

**Files:**
- Create: `src/lib/domain/timeline.ts`
- Test: `src/lib/domain/timeline.test.ts`

**Interfaces:**
- Consumes: aus `challenge.ts` `LocalDate`, `CHALLENGE_START`, `CHALLENGE_END`, `addDays`, `challengeDayNumber`, `endOfDay`; aus `quest.ts` `QuestSet`, `ExerciseTotals`, `EXERCISES`, `emptyTotals`, `totalsOf`, `isQuestComplete`, `completionTime`; aus `bonus.ts` `overtimeBonusPoints`
- Produces:
  - `type DayStatus = 'fulfilled' | 'sick' | 'open' | 'unscored' | 'missed'`
  - `interface SickNote { date: LocalDate; recordedAt: Date }`
  - `interface BonusEntry { id: string; date: LocalDate; bonusPoints: number; distanceKm: number | null; isRunning: boolean; recordedAt: Date }`
  - `interface HunterRecords { scoringStart: LocalDate; sets: readonly QuestSet[]; sickNotes: readonly SickNote[]; bonusEntries: readonly BonusEntry[] }`
  - `interface DaySummary { date: LocalDate; dayNumber: number; status: DayStatus; backfilled: boolean; totals: ExerciseTotals; completedAt: Date | null; bonusPoints: number; overtimePoints: number }`
  - `dayStatus(input: { date: LocalDate; today: LocalDate; scoringStart: LocalDate; totals: ExerciseTotals; sick: boolean }): DayStatus`
  - `buildTimeline(records: HunterRecords, today: LocalDate): DaySummary[]`
  - `fulfilledDays(timeline: readonly DaySummary[]): number`
  - `totalBonusPoints(timeline: readonly DaySummary[]): number`
  - `volumeTotals(timeline: readonly DaySummary[]): ExerciseTotals`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { startOfDay, type LocalDate } from './challenge';
import type { Exercise, QuestSet } from './quest';
import {
	buildTimeline,
	dayStatus,
	fulfilledDays,
	totalBonusPoints,
	volumeTotals,
	type BonusEntry,
	type HunterRecords
} from './timeline';

let sequence = 0;

function at(date: LocalDate, hour: number): Date {
	return new Date(startOfDay(date).getTime() + hour * 3_600_000);
}

function set(date: LocalDate, exercise: Exercise, reps: number, recordedAt = at(date, 12)): QuestSet {
	sequence += 1;
	return { id: `set-${sequence}`, date, exercise, reps, recordedAt };
}

function fullDay(date: LocalDate, recordedAt = at(date, 12)): QuestSet[] {
	return [
		set(date, 'pushups', 100, recordedAt),
		set(date, 'squats', 100, recordedAt),
		set(date, 'situps', 100, recordedAt)
	];
}

function records(partial: Partial<HunterRecords> = {}): HunterRecords {
	return { scoringStart: '2026-10-09', sets: [], sickNotes: [], bonusEntries: [], ...partial };
}

describe('dayStatus', () => {
	const full = { pushups: 100, squats: 100, situps: 100 };
	const partial = { pushups: 100, squats: 40, situps: 0 };
	const base = { today: '2026-10-12', scoringStart: '2026-10-09' };

	it('wertet einen erfüllten Tag auch mit Krankmeldung als erfüllt', () => {
		expect(dayStatus({ ...base, date: '2026-10-10', totals: full, sick: true })).toBe('fulfilled');
	});

	it('wertet einen krank gemeldeten Tag als krank', () => {
		expect(dayStatus({ ...base, date: '2026-10-10', totals: partial, sick: true })).toBe('sick');
	});

	it('lässt den heutigen Tag offen', () => {
		expect(dayStatus({ ...base, date: '2026-10-12', totals: partial, sick: false })).toBe('open');
	});

	it('wertet Tage vor dem Wertungsbeginn nicht', () => {
		expect(
			dayStatus({ ...base, scoringStart: '2026-10-10', date: '2026-10-09', totals: partial, sick: false })
		).toBe('unscored');
	});

	it('wertet übrige vergangene Tage als verpasst', () => {
		expect(dayStatus({ ...base, date: '2026-10-11', totals: partial, sick: false })).toBe('missed');
	});
});

describe('buildTimeline', () => {
	it('reicht vom Start bis heute', () => {
		expect(buildTimeline(records(), '2026-10-12').map((day) => day.date)).toEqual([
			'2026-10-09',
			'2026-10-10',
			'2026-10-11',
			'2026-10-12'
		]);
	});

	it('ist vor dem Start leer', () => {
		expect(buildTimeline(records(), '2026-10-08')).toEqual([]);
	});

	it('endet am Tag 202', () => {
		const timeline = buildTimeline(records(), '2027-06-01');
		expect(timeline).toHaveLength(202);
		expect(timeline[201].date).toBe('2027-04-28');
		expect(timeline[201].status).toBe('missed');
	});

	it('leitet Status, Summen, Tagnummer und Abschlusszeit ab', () => {
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-09'), set('2026-10-10', 'pushups', 60)],
				sickNotes: [{ date: '2026-10-11', recordedAt: at('2026-10-11', 9) }]
			}),
			'2026-10-12'
		);
		expect(timeline.map((day) => day.status)).toEqual(['fulfilled', 'missed', 'sick', 'open']);
		expect(timeline[0].dayNumber).toBe(1);
		expect(timeline[0].totals).toEqual({ pushups: 100, squats: 100, situps: 100 });
		expect(timeline[0].completedAt).toEqual(at('2026-10-09', 12));
		expect(timeline[1].completedAt).toBeNull();
	});

	it('markiert nachgetragene Tage', () => {
		const nextMorning = at('2026-10-10', 30);
		const timeline = buildTimeline(
			records({
				sets: [...fullDay('2026-10-09'), ...fullDay('2026-10-10', nextMorning)],
				sickNotes: [{ date: '2026-10-11', recordedAt: at('2026-10-12', 8) }]
			}),
			'2026-10-12'
		);
		expect(timeline.map((day) => day.backfilled)).toEqual([false, true, true, false]);
	});

	it('summiert Bonuspunkte und Overtime pro Tag', () => {
		const bonusEntries: BonusEntry[] = [
			{ id: 'b1', date: '2026-10-09', bonusPoints: 150, distanceKm: 5, isRunning: true, recordedAt: at('2026-10-09', 18) },
			{ id: 'b2', date: '2026-10-09', bonusPoints: 70, distanceKm: null, isRunning: false, recordedAt: at('2026-10-09', 19) }
		];
		const timeline = buildTimeline(
			records({ sets: [...fullDay('2026-10-09'), set('2026-10-09', 'pushups', 50)], bonusEntries }),
			'2026-10-09'
		);
		expect(timeline[0].bonusPoints).toBe(220);
		expect(timeline[0].overtimePoints).toBe(17.5);
	});

	it('liefert Kennzahlen über die ganze Übersicht', () => {
		const timeline = buildTimeline(
			records({ sets: [...fullDay('2026-10-09'), ...fullDay('2026-10-10'), set('2026-10-10', 'squats', 20)] }),
			'2026-10-11'
		);
		expect(fulfilledDays(timeline)).toBe(2);
		expect(volumeTotals(timeline)).toEqual({ pushups: 200, squats: 220, situps: 200 });
		expect(totalBonusPoints(timeline)).toBe(7);
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/timeline.test.ts`
Expected: FAIL mit `Failed to resolve import "./timeline"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/timeline.ts`:

```ts
import {
	CHALLENGE_END,
	CHALLENGE_START,
	addDays,
	challengeDayNumber,
	endOfDay,
	type LocalDate
} from './challenge';
import {
	EXERCISES,
	completionTime,
	emptyTotals,
	isQuestComplete,
	totalsOf,
	type ExerciseTotals,
	type QuestSet
} from './quest';
import { overtimeBonusPoints } from './bonus';

export type DayStatus = 'fulfilled' | 'sick' | 'open' | 'unscored' | 'missed';

export interface SickNote {
	date: LocalDate;
	recordedAt: Date;
}

export interface BonusEntry {
	id: string;
	date: LocalDate;
	bonusPoints: number;
	distanceKm: number | null;
	isRunning: boolean;
	recordedAt: Date;
}

export interface HunterRecords {
	scoringStart: LocalDate;
	sets: readonly QuestSet[];
	sickNotes: readonly SickNote[];
	bonusEntries: readonly BonusEntry[];
}

export interface DaySummary {
	date: LocalDate;
	dayNumber: number;
	status: DayStatus;
	backfilled: boolean;
	totals: ExerciseTotals;
	completedAt: Date | null;
	bonusPoints: number;
	overtimePoints: number;
}

export function dayStatus(input: {
	date: LocalDate;
	today: LocalDate;
	scoringStart: LocalDate;
	totals: ExerciseTotals;
	sick: boolean;
}): DayStatus {
	if (isQuestComplete(input.totals)) return 'fulfilled';
	if (input.sick) return 'sick';
	if (input.date >= input.today) return 'open';
	if (input.date < input.scoringStart) return 'unscored';
	return 'missed';
}

function groupByDate<T extends { date: LocalDate }>(items: readonly T[]): Map<LocalDate, T[]> {
	const groups = new Map<LocalDate, T[]>();
	for (const item of items) {
		const group = groups.get(item.date);
		if (group) group.push(item);
		else groups.set(item.date, [item]);
	}
	return groups;
}

/** Tagesübersicht eines Hunters vom Challenge-Start bis heute (höchstens bis Tag 202). */
export function buildTimeline(records: HunterRecords, today: LocalDate): DaySummary[] {
	const lastDay = today < CHALLENGE_END ? today : CHALLENGE_END;
	if (lastDay < CHALLENGE_START) return [];

	const setsByDate = groupByDate(records.sets);
	const sickByDate = groupByDate(records.sickNotes);
	const bonusByDate = groupByDate(records.bonusEntries);
	const timeline: DaySummary[] = [];

	for (let date = CHALLENGE_START; date <= lastDay; date = addDays(date, 1)) {
		const sets = setsByDate.get(date) ?? [];
		const sickNotes = sickByDate.get(date) ?? [];
		const bonusEntries = bonusByDate.get(date) ?? [];
		const totals = totalsOf(sets);
		const status = dayStatus({
			date,
			today,
			scoringStart: records.scoringStart,
			totals,
			sick: sickNotes.length > 0
		});
		const dayEnd = endOfDay(date);
		const backfilled =
			status === 'fulfilled'
				? sets.some((entry) => entry.recordedAt >= dayEnd)
				: status === 'sick'
					? sickNotes.some((note) => note.recordedAt >= dayEnd)
					: false;

		timeline.push({
			date,
			dayNumber: challengeDayNumber(date) as number,
			status,
			backfilled,
			totals,
			completedAt: status === 'fulfilled' ? completionTime(sets) : null,
			bonusPoints: bonusEntries.reduce((sum, entry) => sum + entry.bonusPoints, 0),
			overtimePoints: overtimeBonusPoints(totals)
		});
	}
	return timeline;
}

export function fulfilledDays(timeline: readonly DaySummary[]): number {
	return timeline.filter((day) => day.status === 'fulfilled').length;
}

export function totalBonusPoints(timeline: readonly DaySummary[]): number {
	return timeline.reduce((sum, day) => sum + day.bonusPoints + day.overtimePoints, 0);
}

export function volumeTotals(timeline: readonly DaySummary[]): ExerciseTotals {
	const totals = emptyTotals();
	for (const day of timeline) {
		for (const exercise of EXERCISES) totals[exercise] += day.totals[exercise];
	}
	return totals;
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/timeline.test.ts`
Expected: PASS, 12 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/timeline.ts src/lib/domain/timeline.test.ts
git commit -m "feat(domain): Tagesstatus und Tagesübersicht mit Nachtrag-Vermerk" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Streak und Test-Helfer

**Files:**
- Create: `src/lib/domain/streak.ts`, `src/lib/domain/test-helpers.ts`
- Test: `src/lib/domain/streak.test.ts`

**Interfaces:**
- Consumes: `DaySummary`, `DayStatus` aus `timeline.ts`; `CHALLENGE_START`, `addDays` aus `challenge.ts`; `emptyTotals`, `QUEST_TARGET` aus `quest.ts`
- Produces:
  - `interface StreakInfo { current: number; longest: number }`
  - `streaks(timeline: readonly DaySummary[]): StreakInfo`
  - Test-Helfer `timelineOf(statuses: readonly DayStatus[]): DaySummary[]` (Tage ab `CHALLENGE_START`, erfüllte Tage mit je 100 Wiederholungen, sonst 0)

- [ ] **Step 1: Test-Helfer anlegen**

`src/lib/domain/test-helpers.ts`:

```ts
import { CHALLENGE_START, addDays } from './challenge';
import { QUEST_TARGET, emptyTotals } from './quest';
import type { DayStatus, DaySummary } from './timeline';

/** Baut eine Tagesübersicht ab Challenge-Start aus einer Liste von Tagesstatus. */
export function timelineOf(statuses: readonly DayStatus[]): DaySummary[] {
	return statuses.map((status, index) => ({
		date: addDays(CHALLENGE_START, index),
		dayNumber: index + 1,
		status,
		backfilled: false,
		totals:
			status === 'fulfilled'
				? { pushups: QUEST_TARGET, squats: QUEST_TARGET, situps: QUEST_TARGET }
				: emptyTotals(),
		completedAt: null,
		bonusPoints: 0,
		overtimePoints: 0
	}));
}

export function repeat(status: DayStatus, count: number): DayStatus[] {
	return Array.from({ length: count }, () => status);
}
```

- [ ] **Step 2: Failing Test schreiben**

`src/lib/domain/streak.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { streaks } from './streak';
import { repeat, timelineOf } from './test-helpers';

describe('Streak', () => {
	it('ist ohne Tage null', () => {
		expect(streaks([])).toEqual({ current: 0, longest: 0 });
	});

	it('zählt erfüllte Tage am Stück', () => {
		expect(streaks(timelineOf(repeat('fulfilled', 3)))).toEqual({ current: 3, longest: 3 });
	});

	it('endet mit einem verpassten Tag', () => {
		expect(streaks(timelineOf(['fulfilled', 'fulfilled', 'missed', 'fulfilled']))).toEqual({
			current: 1,
			longest: 2
		});
	});

	it('pausiert an Kranktagen und nicht gewerteten Tagen', () => {
		expect(streaks(timelineOf(['fulfilled', 'sick', 'fulfilled']))).toEqual({ current: 2, longest: 2 });
		expect(streaks(timelineOf(['unscored', 'fulfilled', 'unscored', 'fulfilled']))).toEqual({
			current: 2,
			longest: 2
		});
	});

	it('bricht nicht, solange heute noch offen ist', () => {
		expect(streaks(timelineOf(['fulfilled', 'fulfilled', 'open']))).toEqual({ current: 2, longest: 2 });
	});
});
```

- [ ] **Step 3: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/streak.test.ts`
Expected: FAIL mit `Failed to resolve import "./streak"`

- [ ] **Step 4: Implementierung schreiben**

`src/lib/domain/streak.ts`:

```ts
import type { DaySummary } from './timeline';

export interface StreakInfo {
	current: number;
	longest: number;
}

/** Verpasste Tage beenden den Streak, alle anderen nicht erfüllten Tage pausieren ihn. */
export function streaks(timeline: readonly DaySummary[]): StreakInfo {
	let current = 0;
	let longest = 0;
	for (const day of timeline) {
		if (day.status === 'fulfilled') {
			current += 1;
			longest = Math.max(longest, current);
		} else if (day.status === 'missed') {
			current = 0;
		}
	}
	return { current, longest };
}
```

- [ ] **Step 5: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/streak.test.ts`
Expected: PASS, 5 Tests

- [ ] **Step 6: Commit**

```powershell
git add src/lib/domain/streak.ts src/lib/domain/streak.test.ts src/lib/domain/test-helpers.ts
git commit -m "feat(domain): Streak mit Pause an Kranktagen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Level, XP und Rang

**Files:**
- Create: `src/lib/domain/level.ts`
- Test: `src/lib/domain/level.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - Konstanten `XP_PER_QUEST = 100`, `MAX_LEVEL = 51`, `S_RANK_LEVEL = 50`, `S_RANK_QUESTS = 195`, `LEVEL_CURVE = 1.6`
  - `type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'`, `const RANKS: readonly Rank[]`
  - `questsForLevel(level: number): number` (ungerundet)
  - `levelForQuests(quests: number): number`
  - `rankForLevel(level: number): Rank`
  - `interface LevelProgress { quests: number; xp: number; level: number; rank: Rank; levelStartXp: number; nextLevelXp: number | null; progress: number }`
  - `levelProgress(quests: number): LevelProgress`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { levelForQuests, levelProgress, questsForLevel, rankForLevel } from './level';

describe('Level-Kurve', () => {
	it.each([
		[0, 1],
		[1, 2],
		[12, 9],
		[13, 10],
		[42, 19],
		[43, 20],
		[84, 29],
		[85, 30],
		[135, 39],
		[136, 40],
		[194, 49],
		[195, 50],
		[201, 50],
		[202, 51]
	])('ergibt nach %i erfüllten Quests Level %i', (quests, level) => {
		expect(levelForQuests(quests)).toBe(level);
	});

	it('steigt am Anfang schneller als am Ende', () => {
		const early = questsForLevel(3) - questsForLevel(2);
		const late = questsForLevel(50) - questsForLevel(49);
		expect(early).toBeLessThan(1.5);
		expect(late).toBeGreaterThan(6);
	});

	it('erreicht den S-Rang genau mit Quest 195', () => {
		expect(questsForLevel(50)).toBe(195);
	});
});

describe('Rang', () => {
	it.each([
		[1, 'E'],
		[9, 'E'],
		[10, 'D'],
		[19, 'D'],
		[20, 'C'],
		[30, 'B'],
		[40, 'A'],
		[49, 'A'],
		[50, 'S'],
		[51, 'S']
	])('Level %i ist Rang %s', (level, rank) => {
		expect(rankForLevel(level)).toBe(rank);
	});
});

describe('Fortschritt', () => {
	it('startet auf Level 1 mit leerem Balken', () => {
		const progress = levelProgress(0);
		expect(progress).toMatchObject({ quests: 0, xp: 0, level: 1, rank: 'E', levelStartXp: 0 });
		expect(progress.progress).toBe(0);
	});

	it('zeigt den Fortschritt innerhalb eines Levels', () => {
		const progress = levelProgress(100);
		expect(progress.xp).toBe(10_000);
		expect(progress.level).toBe(levelForQuests(100));
		expect(progress.levelStartXp).toBeCloseTo(questsForLevel(progress.level) * 100, 6);
		expect(progress.nextLevelXp).toBeCloseTo(questsForLevel(progress.level + 1) * 100, 6);
		expect(progress.progress).toBeGreaterThan(0);
		expect(progress.progress).toBeLessThan(1);
	});

	it('ist auf Level 51 voll', () => {
		const progress = levelProgress(202);
		expect(progress.level).toBe(51);
		expect(progress.nextLevelXp).toBeNull();
		expect(progress.progress).toBe(1);
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/level.test.ts`
Expected: FAIL mit `Failed to resolve import "./level"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/level.ts`:

```ts
export const XP_PER_QUEST = 100;
export const MAX_LEVEL = 51;
export const S_RANK_LEVEL = 50;
export const S_RANK_QUESTS = 195;
export const LEVEL_CURVE = 1.6;

export const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Rank = (typeof RANKS)[number];

const EPSILON = 1e-9;

/** Erfüllte Quests, die für ein Level nötig sind (ungerundet). */
export function questsForLevel(level: number): number {
	if (level <= 1) return 0;
	return S_RANK_QUESTS * Math.pow((level - 1) / (S_RANK_LEVEL - 1), LEVEL_CURVE);
}

export function levelForQuests(quests: number): number {
	let level = 1;
	while (level < MAX_LEVEL && quests + EPSILON >= questsForLevel(level + 1)) level += 1;
	return level;
}

export function rankForLevel(level: number): Rank {
	if (level >= 50) return 'S';
	if (level >= 40) return 'A';
	if (level >= 30) return 'B';
	if (level >= 20) return 'C';
	if (level >= 10) return 'D';
	return 'E';
}

export interface LevelProgress {
	quests: number;
	xp: number;
	level: number;
	rank: Rank;
	levelStartXp: number;
	nextLevelXp: number | null;
	/** Anteil 0 bis 1 vom aktuellen bis zum nächsten Level. */
	progress: number;
}

export function levelProgress(quests: number): LevelProgress {
	const level = levelForQuests(quests);
	const xp = quests * XP_PER_QUEST;
	const levelStartXp = questsForLevel(level) * XP_PER_QUEST;
	const nextLevelXp = level < MAX_LEVEL ? questsForLevel(level + 1) * XP_PER_QUEST : null;
	const progress =
		nextLevelXp === null
			? 1
			: Math.min(1, Math.max(0, (xp - levelStartXp) / (nextLevelXp - levelStartXp)));
	return { quests, xp, level, rank: rankForLevel(level), levelStartXp, nextLevelXp, progress };
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/level.test.ts`
Expected: PASS, 29 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/level.ts src/lib/domain/level.test.ts
git commit -m "feat(domain): Level-Kurve mit S-Rang an Quest 195" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Badges

**Files:**
- Create: `src/lib/domain/badges.ts`
- Test: `src/lib/domain/badges.test.ts`

**Interfaces:**
- Consumes: `CHALLENGE_DAYS`, `localDateOf`, `minutesOfDay` aus `challenge.ts`; `EXERCISES`, `QUEST_TARGET`, `Exercise` aus `quest.ts`; `DaySummary`, `BonusEntry`, `fulfilledDays`, `totalBonusPoints`, `volumeTotals` aus `timeline.ts`; `streaks` aus `streak.ts`; `RANKS`, `levelProgress` aus `level.ts`; Test: `timelineOf`, `repeat` aus `test-helpers.ts`
- Produces:
  - `type BadgeId = string`, `type BadgeGroup = 'Durchhalten' | 'Rang' | 'Volumen' | 'Bonus' | 'Spaß'`
  - `interface BadgeDefinition { id: BadgeId; name: string; group: BadgeGroup; description: string }`
  - `const BADGES: readonly BadgeDefinition[]`
  - `interface BadgeContext { timeline: readonly DaySummary[]; bonusEntries: readonly BonusEntry[]; activeVerdicts: number; ballotsInClosedVotes: number }`
  - `earnedBadges(context: BadgeContext): BadgeId[]` (in Katalogreihenfolge)

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/badges.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { startOfDay } from './challenge';
import { BADGES, earnedBadges, type BadgeContext } from './badges';
import type { BonusEntry, DaySummary } from './timeline';
import { repeat, timelineOf } from './test-helpers';

function context(timeline: DaySummary[], partial: Partial<BadgeContext> = {}): BadgeContext {
	return { timeline, bonusEntries: [], activeVerdicts: 0, ballotsInClosedVotes: 0, ...partial };
}

function run(date: string, distanceKm: number, isRunning = true): BonusEntry {
	return {
		id: `run-${date}-${distanceKm}`,
		date,
		bonusPoints: 100,
		distanceKm,
		isRunning,
		recordedAt: new Date(startOfDay(date).getTime() + 18 * 3_600_000)
	};
}

describe('Badge-Katalog', () => {
	it('hat eindeutige IDs', () => {
		const ids = BADGES.map((badge) => badge.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('Durchhalten', () => {
	it('vergibt Erwacht ab der ersten erfüllten Quest', () => {
		expect(earnedBadges(context(timelineOf(['missed'])))).not.toContain('awakened');
		expect(earnedBadges(context(timelineOf(['fulfilled'])))).toContain('awakened');
	});

	it('vergibt Streak-Badges nach längstem Streak', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 6))))).not.toContain('double-dungeon');
		const badges = earnedBadges(context(timelineOf([...repeat('fulfilled', 30), 'missed'])));
		expect(badges).toContain('double-dungeon');
		expect(badges).toContain('relentless');
		expect(badges).not.toContain('unstoppable');
	});

	it('vergibt Arise für 7 erfüllte Tage nach einem verpassten Tag, Kranktage pausieren', () => {
		expect(
			earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 3), 'sick', ...repeat('fulfilled', 4)])))
		).toContain('arise');
		expect(earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 6)])))).not.toContain('arise');
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 7))))).not.toContain('arise');
		expect(
			earnedBadges(context(timelineOf(['missed', ...repeat('fulfilled', 3), 'missed', ...repeat('fulfilled', 4)])))
		).not.toContain('arise');
	});

	it('vergibt Shadow Monarch nur für alle 202 Tage', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 202))))).toContain('shadow-monarch');
		expect(
			earnedBadges(context(timelineOf([...repeat('fulfilled', 201), 'sick'])))
		).not.toContain('shadow-monarch');
	});
});

describe('Rang und Volumen', () => {
	it('vergibt Rang-Badges ab dem erreichten Rang', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 12))))).not.toContain('rank-d');
		const badges = earnedBadges(context(timelineOf(repeat('fulfilled', 13))));
		expect(badges).toContain('rank-d');
		expect(badges).not.toContain('rank-c');
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 202))))).toContain('rank-s');
	});

	it('vergibt Volumen-Stufen je Pflichtübung', () => {
		expect(earnedBadges(context(timelineOf(repeat('fulfilled', 9))))).not.toContain('pushups-1');
		const badges = earnedBadges(context(timelineOf(repeat('fulfilled', 10))));
		expect(badges).toContain('pushups-1');
		expect(badges).toContain('squats-1');
		expect(badges).toContain('situps-1');
		expect(badges).not.toContain('pushups-2');
	});
});

describe('Bonus', () => {
	it('vergibt Overtime für mehr als 100 an einem Tag', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(earnedBadges(context(timeline))).not.toContain('overtime');
		timeline[0].totals.pushups = 101;
		expect(earnedBadges(context(timeline))).toContain('overtime');
	});

	it('vergibt Extra-Meile und Gate-Brecher nach Gesamt-BP', () => {
		const timeline = timelineOf(['fulfilled', 'fulfilled']);
		timeline[0].bonusPoints = 999;
		expect(earnedBadges(context(timeline))).not.toContain('extra-mile');
		timeline[1].overtimePoints = 1;
		expect(earnedBadges(context(timeline))).toContain('extra-mile');
		timeline[1].bonusPoints = 9_000;
		expect(earnedBadges(context(timeline))).toContain('gate-breaker');
	});

	it('vergibt den Monatsmarathon für 42,2 km Laufen in einem Kalendermonat', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-03', 20), run('2026-11-20', 22.2)] }))
		).toContain('monthly-marathon');
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-30', 20), run('2026-12-01', 22.2)] }))
		).not.toContain('monthly-marathon');
		expect(
			earnedBadges(context(timeline, { bonusEntries: [run('2026-11-03', 50, false)] }))
		).not.toContain('monthly-marathon');
	});
});

describe('Spaß', () => {
	it('vergibt Frühaufsteher und Last Minute nur für live erfüllte Quests', () => {
		const early = timelineOf(['fulfilled']);
		early[0].completedAt = new Date(startOfDay(early[0].date).getTime() + (7 * 60 + 59) * 60_000);
		expect(earnedBadges(context(early))).toContain('early-bird');

		const late = timelineOf(['fulfilled']);
		late[0].completedAt = new Date(startOfDay(late[0].date).getTime() + (23 * 60 + 30) * 60_000);
		expect(earnedBadges(context(late))).toContain('last-minute');

		const backfilled = timelineOf(['fulfilled']);
		backfilled[0].completedAt = new Date(startOfDay(backfilled[0].date).getTime() + 31 * 3_600_000);
		const badges = earnedBadges(context(backfilled));
		expect(badges).not.toContain('early-bird');
		expect(badges).not.toContain('last-minute');
	});

	it('vergibt Penalty Zone und Richter', () => {
		const timeline = timelineOf(['fulfilled']);
		expect(earnedBadges(context(timeline, { activeVerdicts: 1 }))).toContain('penalty-zone');
		expect(earnedBadges(context(timeline, { ballotsInClosedVotes: 9 }))).not.toContain('judge');
		expect(earnedBadges(context(timeline, { ballotsInClosedVotes: 10 }))).toContain('judge');
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/badges.test.ts`
Expected: FAIL mit `Failed to resolve import "./badges"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/badges.ts`:

```ts
import { CHALLENGE_DAYS, localDateOf, minutesOfDay } from './challenge';
import { EXERCISES, QUEST_TARGET, type Exercise } from './quest';
import {
	fulfilledDays,
	totalBonusPoints,
	volumeTotals,
	type BonusEntry,
	type DaySummary
} from './timeline';
import { streaks } from './streak';
import { RANKS, levelProgress } from './level';

export type BadgeId = string;
export type BadgeGroup = 'Durchhalten' | 'Rang' | 'Volumen' | 'Bonus' | 'Spaß';

export interface BadgeDefinition {
	id: BadgeId;
	name: string;
	group: BadgeGroup;
	description: string;
}

export interface BadgeContext {
	timeline: readonly DaySummary[];
	bonusEntries: readonly BonusEntry[];
	/** Verhängte, nicht aufgehobene Strafen des Hunters. */
	activeVerdicts: number;
	/** Abgegebene Stimmen des Hunters in beendeten Abstimmungen. */
	ballotsInClosedVotes: number;
}

const VOLUME_STEPS = [1_000, 5_000, 10_000, 20_000] as const;
const ROMAN = ['I', 'II', 'III', 'IV'] as const;
const VOLUME_NAMES: Record<Exercise, string> = {
	pushups: 'Liegestütze',
	squats: 'Kniebeugen',
	situps: 'Sit-ups'
};
const EARLY_BIRD_BEFORE = 8 * 60;
const LAST_MINUTE_FROM = 23 * 60;
const MARATHON_KM = 42.2;

export const BADGES: readonly BadgeDefinition[] = [
	{ id: 'awakened', name: 'Erwacht', group: 'Durchhalten', description: 'Erste Daily Quest erfüllt' },
	{ id: 'double-dungeon', name: 'Double Dungeon überlebt', group: 'Durchhalten', description: '7 Tage Streak' },
	{ id: 'relentless', name: 'Unermüdlich', group: 'Durchhalten', description: '30 Tage Streak' },
	{ id: 'unstoppable', name: 'Unaufhaltsam', group: 'Durchhalten', description: '100 Tage Streak' },
	{ id: 'arise', name: 'Arise', group: 'Durchhalten', description: '7 Tage am Stück nach einem verpassten Tag' },
	{ id: 'shadow-monarch', name: 'Shadow Monarch', group: 'Durchhalten', description: 'Alle 202 Tage erfüllt' },
	...RANKS.slice(1).map((rank) => ({
		id: `rank-${rank.toLowerCase()}`,
		name: `Rang ${rank}`,
		group: 'Rang' as const,
		description: `${rank}-Rang erreicht`
	})),
	...EXERCISES.flatMap((exercise) =>
		VOLUME_STEPS.map((step, index) => ({
			id: `${exercise}-${index + 1}`,
			name: `${VOLUME_NAMES[exercise]} ${ROMAN[index]}`,
			group: 'Volumen' as const,
			description: `${step.toLocaleString('de-DE')} ${VOLUME_NAMES[exercise]} gesamt`
		}))
	),
	{ id: 'overtime', name: 'Overtime', group: 'Bonus', description: 'Erstmals über 100 bei einer Pflichtübung' },
	{ id: 'extra-mile', name: 'Extra-Meile', group: 'Bonus', description: '1.000 BP gesamt' },
	{ id: 'gate-breaker', name: 'Gate-Brecher', group: 'Bonus', description: '10.000 BP gesamt' },
	{ id: 'monthly-marathon', name: 'Monatsmarathon', group: 'Bonus', description: '42,2 km Laufen in einem Kalendermonat' },
	{ id: 'early-bird', name: 'Frühaufsteher', group: 'Spaß', description: 'Daily Quest live vor 8 Uhr erfüllt' },
	{ id: 'last-minute', name: 'Last Minute', group: 'Spaß', description: 'Daily Quest live nach 23 Uhr erfüllt' },
	{ id: 'penalty-zone', name: 'Penalty Zone', group: 'Spaß', description: 'Erste Strafe kassiert' },
	{ id: 'judge', name: 'Richter', group: 'Spaß', description: '10 Stimmen abgegeben' }
];

function hasArise(timeline: readonly DaySummary[]): boolean {
	let afterMiss = false;
	let count = 0;
	for (const day of timeline) {
		if (day.status === 'missed') {
			afterMiss = true;
			count = 0;
		} else if (day.status === 'fulfilled' && afterMiss) {
			count += 1;
			if (count >= 7) return true;
		}
	}
	return false;
}

function hasMonthlyMarathon(entries: readonly BonusEntry[]): boolean {
	const kmByMonth = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.isRunning || entry.distanceKm === null) continue;
		const month = entry.date.slice(0, 7);
		kmByMonth.set(month, (kmByMonth.get(month) ?? 0) + entry.distanceKm);
	}
	return [...kmByMonth.values()].some((km) => km >= MARATHON_KM - 1e-9);
}

export function earnedBadges(context: BadgeContext): BadgeId[] {
	const { timeline } = context;
	const earned = new Set<BadgeId>();
	const quests = fulfilledDays(timeline);

	if (quests >= 1) earned.add('awakened');
	const { longest } = streaks(timeline);
	if (longest >= 7) earned.add('double-dungeon');
	if (longest >= 30) earned.add('relentless');
	if (longest >= 100) earned.add('unstoppable');
	if (hasArise(timeline)) earned.add('arise');
	if (quests === CHALLENGE_DAYS) earned.add('shadow-monarch');

	const rankIndex = RANKS.indexOf(levelProgress(quests).rank);
	for (const rank of RANKS.slice(1, rankIndex + 1)) earned.add(`rank-${rank.toLowerCase()}`);

	const volume = volumeTotals(timeline);
	for (const exercise of EXERCISES) {
		VOLUME_STEPS.forEach((step, index) => {
			if (volume[exercise] >= step) earned.add(`${exercise}-${index + 1}`);
		});
	}

	if (timeline.some((day) => EXERCISES.some((exercise) => day.totals[exercise] > QUEST_TARGET))) {
		earned.add('overtime');
	}
	const points = totalBonusPoints(timeline);
	if (points >= 1_000) earned.add('extra-mile');
	if (points >= 10_000) earned.add('gate-breaker');
	if (hasMonthlyMarathon(context.bonusEntries)) earned.add('monthly-marathon');

	for (const day of timeline) {
		if (day.status !== 'fulfilled' || !day.completedAt) continue;
		if (localDateOf(day.completedAt) !== day.date) continue;
		const minutes = minutesOfDay(day.completedAt);
		if (minutes < EARLY_BIRD_BEFORE) earned.add('early-bird');
		if (minutes >= LAST_MINUTE_FROM) earned.add('last-minute');
	}

	if (context.activeVerdicts >= 1) earned.add('penalty-zone');
	if (context.ballotsInClosedVotes >= 10) earned.add('judge');

	return BADGES.filter((badge) => earned.has(badge.id)).map((badge) => badge.id);
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/badges.test.ts`
Expected: PASS, 12 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/badges.ts src/lib/domain/badges.test.ts
git commit -m "feat(domain): Badge-Katalog und Bedingungen" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Abstimmung

**Files:**
- Create: `src/lib/domain/votes.ts`
- Test: `src/lib/domain/votes.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `interface Ballot { voterId: string; penaltyId: string }`
  - `interface VoteResult { closed: boolean; counts: Record<string, number>; missingVoterIds: string[]; winnerPenaltyId: string | null; decidedByLot: boolean }`
  - `randomIndex(count: number): number` (kryptografischer Zufall, 0 bis count − 1)
  - `eligibleVoters(activeHunterIds: readonly string[], offenderId: string): string[]`
  - `tallyVote(eligibleVoterIds: readonly string[], ballots: readonly Ballot[], pickIndex?: (count: number) => number): VoteResult`

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/votes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { eligibleVoters, randomIndex, tallyVote } from './votes';

describe('Stimmberechtigte', () => {
	it('sind alle aktiven Hunter außer dem Betroffenen', () => {
		expect(eligibleVoters(['tobias', 'niklas', 'ramzy'], 'niklas')).toEqual(['tobias', 'ramzy']);
	});
});

describe('Auszählung', () => {
	const voters = ['a', 'b', 'c'];

	it('bleibt offen, solange jemand nicht abgestimmt hat', () => {
		const result = tallyVote(voters, [
			{ voterId: 'a', penaltyId: 'p1' },
			{ voterId: 'b', penaltyId: 'p1' }
		]);
		expect(result.closed).toBe(false);
		expect(result.missingVoterIds).toEqual(['c']);
		expect(result.winnerPenaltyId).toBeNull();
		expect(result.counts).toEqual({ p1: 2 });
	});

	it('endet, wenn alle abgestimmt haben, und die Mehrheit gewinnt', () => {
		const result = tallyVote(voters, [
			{ voterId: 'a', penaltyId: 'p1' },
			{ voterId: 'b', penaltyId: 'p2' },
			{ voterId: 'c', penaltyId: 'p2' }
		]);
		expect(result).toMatchObject({ closed: true, winnerPenaltyId: 'p2', decidedByLot: false });
	});

	it('entscheidet einen Gleichstand per Los', () => {
		const result = tallyVote(
			['a', 'b'],
			[
				{ voterId: 'a', penaltyId: 'p2' },
				{ voterId: 'b', penaltyId: 'p1' }
			],
			() => 1
		);
		expect(result).toMatchObject({ closed: true, winnerPenaltyId: 'p2', decidedByLot: true });
	});

	it('zählt die letzte Stimme eines Hunters', () => {
		const result = tallyVote(
			['a'],
			[
				{ voterId: 'a', penaltyId: 'p1' },
				{ voterId: 'a', penaltyId: 'p3' }
			]
		);
		expect(result.winnerPenaltyId).toBe('p3');
		expect(result.counts).toEqual({ p3: 1 });
	});

	it('ignoriert Stimmen von Nicht-Stimmberechtigten', () => {
		const result = tallyVote(['a'], [
			{ voterId: 'offender', penaltyId: 'p1' },
			{ voterId: 'a', penaltyId: 'p2' }
		]);
		expect(result.winnerPenaltyId).toBe('p2');
		expect(result.counts).toEqual({ p2: 1 });
	});

	it('endet nie ohne Stimmberechtigte', () => {
		expect(tallyVote([], []).closed).toBe(false);
	});

	it('liefert Zufallsindizes im gültigen Bereich', () => {
		for (let i = 0; i < 50; i += 1) {
			const index = randomIndex(3);
			expect(index).toBeGreaterThanOrEqual(0);
			expect(index).toBeLessThan(3);
		}
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/votes.test.ts`
Expected: FAIL mit `Failed to resolve import "./votes"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/votes.ts`:

```ts
export interface Ballot {
	voterId: string;
	penaltyId: string;
}

export interface VoteResult {
	closed: boolean;
	counts: Record<string, number>;
	missingVoterIds: string[];
	winnerPenaltyId: string | null;
	decidedByLot: boolean;
}

export function randomIndex(count: number): number {
	const buffer = new Uint32Array(1);
	crypto.getRandomValues(buffer);
	return buffer[0] % count;
}

export function eligibleVoters(activeHunterIds: readonly string[], offenderId: string): string[] {
	return activeHunterIds.filter((id) => id !== offenderId);
}

/** Zählt eine Abstimmung aus. Sie endet erst, wenn alle Stimmberechtigten abgestimmt haben. */
export function tallyVote(
	eligibleVoterIds: readonly string[],
	ballots: readonly Ballot[],
	pickIndex: (count: number) => number = randomIndex
): VoteResult {
	const eligible = new Set(eligibleVoterIds);
	const latestChoice = new Map<string, string>();
	for (const ballot of ballots) {
		if (eligible.has(ballot.voterId)) latestChoice.set(ballot.voterId, ballot.penaltyId);
	}

	const counts: Record<string, number> = {};
	for (const penaltyId of latestChoice.values()) counts[penaltyId] = (counts[penaltyId] ?? 0) + 1;

	const missingVoterIds = eligibleVoterIds.filter((id) => !latestChoice.has(id));
	const closed = eligibleVoterIds.length > 0 && missingVoterIds.length === 0;
	if (!closed) {
		return { closed, counts, missingVoterIds, winnerPenaltyId: null, decidedByLot: false };
	}

	const topCount = Math.max(...Object.values(counts));
	const leaders = Object.keys(counts)
		.filter((penaltyId) => counts[penaltyId] === topCount)
		.sort();
	const winnerPenaltyId = leaders.length === 1 ? leaders[0] : leaders[pickIndex(leaders.length)];
	return { closed, counts, missingVoterIds, winnerPenaltyId, decidedByLot: leaders.length > 1 };
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/votes.test.ts`
Expected: PASS, 8 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/votes.ts src/lib/domain/votes.test.ts
git commit -m "feat(domain): Auszählung der Strafabstimmung mit Los bei Gleichstand" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Abgleich verpasster Tage

**Files:**
- Create: `src/lib/domain/reconcile.ts`
- Test: `src/lib/domain/reconcile.test.ts`

**Interfaces:**
- Consumes: `LocalDate` aus `challenge.ts`; `DaySummary` aus `timeline.ts`; Test: `timelineOf` aus `test-helpers.ts`
- Produces:
  - `type LiftReason = 'backfill' | 'sick'`
  - `interface MissedDayChanges { create: LocalDate[]; lift: { date: LocalDate; reason: LiftReason }[] }`
  - `reconcileMissedDays(timeline: readonly DaySummary[], activeMissedDates: ReadonlySet<LocalDate>): MissedDayChanges`

Verwendung in Plan 2: Der Server ruft die Funktion um Mitternacht, beim Serverstart und nach jeder Änderung an Sätzen oder Krankmeldungen eines Hunters auf. `create` startet je Tag ein Verpasst-Ereignis mit Abstimmung, `lift` lässt die Abstimmung entfallen bzw. hebt die verhängte Strafe mit dem Grund auf.

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/reconcile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reconcileMissedDays } from './reconcile';
import { timelineOf } from './test-helpers';

describe('Abgleich verpasster Tage', () => {
	it('legt neue verpasste Tage an', () => {
		const timeline = timelineOf(['fulfilled', 'missed', 'missed', 'open']);
		expect(reconcileMissedDays(timeline, new Set())).toEqual({
			create: ['2026-10-10', '2026-10-11'],
			lift: []
		});
	});

	it('legt bereits aktive verpasste Tage nicht doppelt an', () => {
		const timeline = timelineOf(['missed', 'missed']);
		expect(reconcileMissedDays(timeline, new Set(['2026-10-09']))).toEqual({
			create: ['2026-10-10'],
			lift: []
		});
	});

	it('hebt verpasste Tage nach Nachtrag oder Krankmeldung auf', () => {
		const timeline = timelineOf(['fulfilled', 'sick', 'missed']);
		const active = new Set(['2026-10-09', '2026-10-10', '2026-10-11']);
		expect(reconcileMissedDays(timeline, active)).toEqual({
			create: [],
			lift: [
				{ date: '2026-10-09', reason: 'backfill' },
				{ date: '2026-10-10', reason: 'sick' }
			]
		});
	});

	it('ignoriert offene und nicht gewertete Tage', () => {
		const timeline = timelineOf(['unscored', 'unscored', 'open']);
		expect(reconcileMissedDays(timeline, new Set())).toEqual({ create: [], lift: [] });
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/reconcile.test.ts`
Expected: FAIL mit `Failed to resolve import "./reconcile"`

- [ ] **Step 3: Implementierung schreiben**

`src/lib/domain/reconcile.ts`:

```ts
import type { LocalDate } from './challenge';
import type { DaySummary } from './timeline';

export type LiftReason = 'backfill' | 'sick';

export interface MissedDayChanges {
	create: LocalDate[];
	lift: { date: LocalDate; reason: LiftReason }[];
}

/**
 * Vergleicht den abgeleiteten Tagesstatus mit den aktiven Verpasst-Ereignissen.
 * Neue verpasste Tage werden angelegt, nachgetragene oder krank gemeldete aufgehoben.
 */
export function reconcileMissedDays(
	timeline: readonly DaySummary[],
	activeMissedDates: ReadonlySet<LocalDate>
): MissedDayChanges {
	const create: LocalDate[] = [];
	const lift: MissedDayChanges['lift'] = [];

	for (const day of timeline) {
		if (day.status === 'missed' && !activeMissedDates.has(day.date)) create.push(day.date);
		if (!activeMissedDates.has(day.date)) continue;
		if (day.status === 'fulfilled') lift.push({ date: day.date, reason: 'backfill' });
		else if (day.status === 'sick') lift.push({ date: day.date, reason: 'sick' });
	}
	return { create, lift };
}
```

- [ ] **Step 4: Test laufen lassen, er muss bestehen**

Run: `npx vitest run src/lib/domain/reconcile.test.ts`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/reconcile.ts src/lib/domain/reconcile.test.ts
git commit -m "feat(domain): Abgleich verpasster Tage mit Nachtrag und Krankmeldung" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Öffentliche Schnittstelle, Doku und Gesamtprüfung

**Files:**
- Create: `src/lib/domain/index.ts`, `src/lib/domain/README.md`
- Test: `src/lib/domain/index.test.ts`

**Interfaces:**
- Consumes: alle Module aus Task 2 bis 10
- Produces: `$lib/domain` als einziger Importpfad für Plan 2 und 3 (Re-Export aller öffentlichen Typen und Funktionen; `test-helpers.ts` wird nicht exportiert)

- [ ] **Step 1: Failing Test schreiben**

`src/lib/domain/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('Öffentliche Schnittstelle', () => {
	it('exportiert die Bausteine für Server und Oberfläche', () => {
		for (const name of [
			'buildTimeline',
			'streaks',
			'levelProgress',
			'earnedBadges',
			'tallyVote',
			'eligibleVoters',
			'reconcileMissedDays',
			'timeBonusPoints',
			'repsBonusPoints',
			'localDateOf',
			'daysUntilDeparture',
			'BADGES',
			'EXERCISES',
			'EFFORTS'
		]) {
			expect(domain).toHaveProperty(name);
		}
		expect(domain).not.toHaveProperty('timelineOf');
	});
});
```

- [ ] **Step 2: Test laufen lassen, er muss fehlschlagen**

Run: `npx vitest run src/lib/domain/index.test.ts`
Expected: FAIL mit `Failed to resolve import "./index"`

- [ ] **Step 3: Schnittstelle und Doku schreiben**

`src/lib/domain/index.ts`:

```ts
export * from './challenge';
export * from './quest';
export * from './bonus';
export * from './timeline';
export * from './streak';
export * from './level';
export * from './badges';
export * from './votes';
export * from './reconcile';
```

`src/lib/domain/README.md`:

```markdown
# Domänenmodul

Alle Spielregeln von Level Up · Kalabrien als reine Funktionen. Keine Datenbank, kein SvelteKit, keine aktuelle Uhrzeit: „heute“ und „jetzt“ werden immer übergeben. Importiert wird ausschließlich über `$lib/domain`.

| Datei | Inhalt |
|---|---|
| `challenge.ts` | Challenge-Kalender (09.10.2026 bis 28.04.2027), Berliner Tagesgrenzen |
| `quest.ts` | Pflichtübungen, Sätze, Daily Quest |
| `bonus.ts` | Stufen und Bonuspunkte (Minuten × Stufe) |
| `timeline.ts` | Tagesstatus und Tagesübersicht eines Hunters |
| `streak.ts` | Aktueller und längster Streak |
| `level.ts` | Level-Kurve, XP, Rang |
| `badges.ts` | Badge-Katalog und Bedingungen |
| `votes.ts` | Auszählung der Strafabstimmung |
| `reconcile.ts` | Abgleich verpasster Tage |

Begriffe: Hunter = Teilnehmer, Satz = `QuestSet`, Krankmeldung = `SickNote`, Nachtrag = `backfilled`, Wertungsbeginn = `scoringStart`, Stufe = `Effort`. Die vollständige Regelbeschreibung steht in `docs/specs/2026-10-09-level-up-kalabrien-design.md`.
```

- [ ] **Step 4: Alle Tests, Typprüfung und Build laufen lassen**

```powershell
npm test
npm run check
npm run build
```

Expected: Vitest meldet 10 Testdateien bestanden und 0 fehlgeschlagen. `svelte-check found 0 errors and 0 warnings`. Build endet mit `✔ done`.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/domain/index.ts src/lib/domain/index.test.ts src/lib/domain/README.md
git commit -m "feat(domain): öffentliche Schnittstelle und Moduldoku" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Abdeckung der Spezifikation durch Plan 1

| Abschnitt der Spezifikation | Umgesetzt in |
|---|---|
| 1 Zeitraum, Countdown, Zeitzone | Task 2 |
| 3.1 Daily Quest, Sätze, Nachtrag-Erkennung | Task 3, Task 5 |
| 3.2 Tagesstatus | Task 5 |
| 3.3 Auswertung (Entscheidungslogik) | Task 10 (Job selbst in Plan 2) |
| 3.4 Nachtrag und Krankmeldung heben auf | Task 10 (Ausführung in Plan 2) |
| 3.6 Abstimmung (Auszählung, Stimmberechtigte, Los) | Task 9 (Ablauf und Speicherung in Plan 2) |
| 3.7 Streak | Task 6 |
| 4.1 XP und Level, 4.2 Rang | Task 7 |
| 4.3 Bonuspunkte | Task 4, Task 5 |
| 4.4 Badges | Task 8 |
| 10 Tests Zeitumstellung, Level-Grenzen, Badges, Abstimmung | Task 2, 7, 8, 9 |

Abschnitte 5 bis 9 (Screens, Design, Konten, Technik, Betrieb) folgen in Plan 2 bis 4, siehe `2026-10-09-00-roadmap.md`.
