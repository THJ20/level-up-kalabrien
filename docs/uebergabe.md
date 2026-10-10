# Level Up · Kalabrien · Stand und Übergabe

Stand 11.10.2026. Dieses Dokument reicht, um in einer neuen Session ohne Vorwissen weiterzuarbeiten.

## Worum es geht

- Private Web-App (PWA) für eine Gruppe von 2 bis 5 Leuten.
- Jeder erfüllt jeden Tag seine Daily Quest, also seinen eigenen Trainingsplan. Offizieller Start ist Mo 12.10.2026 (Tag 1), letzter Tag Mi 28.04.2027 (Tag 199). Davor gibt es drei Aufwärmtage (Fr 09.10. bis So 11.10.).
- Ziel ist der Abflug zur Reise nach Kalabrien am 29.04.2027, der Countdown läuft dorthin.
- Look „Shadow Monarch“, angelehnt an das System aus Solo Leveling, aber ohne Originalgrafiken, Logos oder Namen. Zweites Farbschema „Gate“ in Schwarz und Orange. System-Meldungen sind englisch, alles andere deutsch.
- Komplett privat. Im Repo steht nichts mit Bezug zum Arbeitgeber oder zu Firmenwerkzeugen.

## Wo alles liegt

- Code lokal: `C:\Users\TobiasHeinze\Documents\level-up-kalabrien`
- GitHub privat: https://github.com/THJ20/level-up-kalabrien (Branch `main`)
- Spezifikation: `docs/specs/2026-10-09-level-up-kalabrien-design.md`, dazu die Überarbeitung `docs/specs/2026-10-10-ueberarbeitung-1-design.md` (gilt vorrangig)
- Roadmap und Pläne: `docs/plans/` (Roadmap `00`, Pläne `01` bis `04` und `06` erledigt, `05` offen)
- API-Doku: `docs/api.md`
- Logo und Avatare von Tobias: `assets/logo`, `assets/avatars`
- Git-Identität (nur in diesem Repo): Tobias Heinze <heinze.tobias20@gmail.com>
- GitHub-CLI: `C:\Program Files\GitHub CLI\gh.exe` (nicht im PATH), angemeldet als THJ20

## Spielregeln, wie entschieden

**Trainingsplan**
- Jeder Spieler hat seinen eigenen Plan, er gilt jeden Tag gleich. Ein Planpunkt ist eine Übung aus dem gemeinsamen Katalog mit einem Ziel in Wiederholungen, Minuten oder Kilometern. 1 bis 12 Punkte.
- Startplan sind 100 Liegestütze, 100 Kniebeugen, 100 Sit-ups/Crunches (Kernübungen mit festen IDs `pushups`, `squats`, `situps`).
- Änderungen gelten ab dem nächsten Tag. Solange jemand noch keinen Satz eingetragen hat, gilt sein Plan rückwirkend ab Beginn. Vergangene Tage werden immer am damals gültigen Plan gemessen.
- Alle sehen die Pläne der anderen im Statusfenster. Eine Änderung steht im Feed.
- Import über einen Kopier-Prompt für die eigene KI. Die App erkennt die Antwort im Browser (Format `Übung | Ziel | Einheit`, JSON, CSV oder freie Zeilen), ohne eigene KI und ohne API-Key.

**Tage**
- Zustände: erfüllt, krank, offen (heute), nicht gewertet, verpasst und Aufwärmtag.
- Ein Tag ist erfüllt, wenn jeder Planpunkt sein Ziel erreicht. Ausgewertet wird um Mitternacht deutscher Zeit.
- Aufwärmtage kann man eintragen, sie geben aber kein XP, keinen Streak, keine Bonuspunkte für die Wertung und keine Strafe.
- Wertungsbeginn ist das spätere Datum aus Go-live und Registrierung. Tage davor zählen, wenn sie erfüllt nachgetragen werden. Leere Tage davor bleiben ohne Wertung und ohne Strafe.

**Verpasste Tage und Strafen**
- Ein verpasster Tag ist für alle sichtbar rot, und es startet eine Strafabstimmung. Das Warnfenster dazu flackert wie eine elektrische Störung.
- Abstimmen dürfen alle außer dem Betroffenen. Die Abstimmung endet erst, wenn alle abgestimmt haben. Bei Gleichstand entscheidet das Los.
- Den Strafkatalog pflegen alle Hunter. Das Strafbuch dokumentiert nur, erledigt werden die Strafen außerhalb der App.

**Nachtragen und Krankmeldung**
- Nachtragen geht unbegrenzt. Ein Nachtrag oder eine Krankmeldung hebt die Abstimmung auf und auch eine schon verhängte Strafe.
- Krankmelden geht unbegrenzt und auch rückwirkend, aber nicht an Aufwärmtagen. Ein Kranktag bringt kein XP und pausiert den Streak, ohne ihn zu brechen.

**Level und Rang**
- XP gibt es nur für erfüllte Daily Quests, 100 XP pro Tag. Bonuspunkte zählen nicht fürs Level.
- Die Level-Kurve ist q(L) = 192 × ((L minus 1) / 49) hoch 1,6. Puffer 7 Tage.
- Ränge: E (Level 1 bis 9), D (10 bis 19), C (20 bis 29), B (30 bis 39), A (40 bis 49), S (ab Level 50, das ist Quest 192 bzw. der 21.04.2027 bei durchgehender Erfüllung).
- Level 51 gibt es nur mit allen 199 Tagen.
- Startübersicht und Statusfenster zeigen „noch X XP bis Lv. Y“.

**Bonuspunkte**
- Eigene Wertung, getrennt vom Level. In der Gesamt-Rangliste entscheiden sie bei gleichem Level.
- Minuten mal Anstrengungsstufe (Session-RPE nach Foster): locker 3, moderat 5, hart 7, am Limit 9.
- Wiederholungs-Übungen werden über Sekunden pro Wiederholung in Minuten umgerechnet.
- Mehrleistung über das Planziel zählt mit: Wiederholungen mit den Sekunden der Übung und Stufe hart, Minuten mal 7, Kilometer nicht.
- Den Übungskatalog pflegen alle gemeinsam. Er startet mit 15 Zusatzübungen und den drei Kernübungen.

**Badges, Profil, Push und Login**
- 28 Badges in fünf Gruppen (Durchhalten, Rang, Volumen, Bonus, Spaß), jedes mit eigenem Lucide-Icon und Fortschritt. Erfolge-Seite zeigt alle, auch wer welche hat.
- Login-Name ist fest. Der Spielername ist frei wählbar, eindeutig und löschbar. Profilbild als eigenes Foto (der Server speichert 256-px-WebP) oder einer von acht Avataren. Farbschema pro Spieler.
- Push-Benachrichtigungen gibt es für die Abenderinnerung (Uhrzeit wählbar, Standard 20:00), für gestartete Abstimmungen und als tägliche Erinnerung um 18:00 an offene Stimmen. Alles ist abschaltbar.
- Login nur per Einladungslink (7 Tage gültig, einmal nutzbar) und Passwort mit mindestens 10 Zeichen. Der erste Hunter wird Admin. Man bleibt 180 Tage eingeloggt, nach 5 Fehlversuchen ist der Login 15 Minuten gesperrt.

## Technik

- SvelteKit 3, Svelte 5 (Runes), Vite 8, TypeScript 6, Node 24.
- Datenbank: SQLite (better-sqlite3) mit Drizzle und eingebetteten Migrationen (`0000` bis `0002`).
- Weitere Bausteine: Argon2, web-push, croner, zod, ECharts, idb-keyval, sharp (auch zur Laufzeit für Profilbilder), Playwright (mit Edge, ohne Browser-Download).
- Besonderheiten von SvelteKit 3:
  - Es gibt keine `svelte.config.js` mehr, die Konfiguration steht in `vite.config.ts`.
  - Importe aus `src/lib` laufen über `#lib/...` mit `.ts`-Endung, z. B. `#lib/domain/index.ts`.
  - Die Hook-Typen kommen aus `@sveltejs/kit/hooks`.
  - `goto` kennt jetzt `replace`, `reset` und `refreshAll`.
- Struktur:
  - `src/lib/domain` enthält die reinen Spielregeln, auch Pläne (`plan.ts`) und den Import-Parser (`plan-import.ts`).
  - `src/lib/server` enthält Dienste, Datenbank, Login, Push, Scheduler, Backups, Pläne (`plans.ts`) und Profilbilder (`avatars.ts`).
  - `src/routes/api` ist die JSON-API, `src/routes/(app)` sind die Seiten (neu: `/plan`, `/erfolge`).
  - `src/lib/ui` und `src/lib/client` gehören zur Oberfläche, `src/service-worker` ist der Service Worker.
  - Farben nur über CSS-Variablen in `src/lib/ui/theme.css`, das Farbschema setzt der Server als `data-theme` am `<html>`.
- Prüfen: `npm test` (252 Tests), `npx svelte-check --tsconfig ./tsconfig.json`, `npm run build`.

## Lokal starten und testen

1. `npm run build`
2. Starten mit `DATABASE_PATH=data/dev.db`, `PORT=5180` und `ORIGIN=http://localhost:5180`, dann `node build/index.js`. Beim allerersten Start steht ein Admin-Einladungslink im Log.
3. Für einen Stand mitten in der Challenge zusätzlich `SIMULATED_NOW=2026-10-20T19:00:00+02:00` und `GO_LIVE_DATE=2026-10-12` setzen.
4. Testdaten anlegen: `node scripts/seed-dev.mjs <Admin-Token> <URL>` legt Tobias (Admin), Niklas, Ramzy und Steffen mit Plänen, Avataren und Einträgen an. Das Testpasswort steht im Skript.
5. `node scripts/dev-vote.mjs <URL>` erzeugt eine offene Abstimmung zum Ansehen.
6. `node scripts/screenshots.mjs <Ordner> <URL> [Hunter]` macht Screenshots aller Seiten auf Handy- und Desktop-Breite (Ramzy nutzt in den Testdaten das Farbschema Gate).
7. Nie `npm run check` oder `vite build` laufen lassen, während der Dev-Server läuft. Das bringt ihn zum Hängen.

## Offen

- **Plan 5 Betrieb und Abnahme** (noch nicht geschrieben):
  - Dockerfile und docker-compose mit Datenvolume (Datenbank, Backups und `avatars/` im selben Volume)
  - HTTPS über Caddy
  - Sicherheits-Checkliste für Niklas: vor der Installation Firewall nur auf 22, 80 und 443, dazu automatische Updates und SSH nur per Schlüssel
  - Playwright-Abläufe
  - Abnahme auf echtem iPhone und Android-Handy, auch Foto-Upload vom iPhone (HEIC wird im Browser umgewandelt)
  - Go-live mit `GO_LIVE_DATE`
  - **Pflicht vor dem Go-live:** Das App-Icon muss in den Push-Benachrichtigungen erscheinen wie bei normalen Apps. Das Logo von Tobias ist eingebaut (`assets/logo`, Icons per `scripts/cut-logo.mjs` und `scripts/generate-icons.mjs`). Der Service Worker nutzt `icon-192.png` als großes Icon und `badge-96.png` als einfarbiges Status-Icon für Android, iOS nimmt das Homescreen-Icon. Offen ist die Prüfung auf echtem iPhone und Android.
- **Wartet auf Niklas**, denn die App soll auf seinem Server laufen. Folgende Fragen sind offen:
  1. Betriebssystem, Docker und Docker Compose
  2. Reverse Proxy für HTTPS
  3. Domain oder Subdomain
  4. SSH-Zugang oder Deployment durch ihn
  5. Backups
  6. Freier RAM und Speicher (die App braucht etwa 256 MB RAM und unter 1 GB Platte)
  7. GitHub-Account für den Repo-Zugriff
- Push-Benachrichtigungen und der Offline-Modus lassen sich erst auf echten Handys mit HTTPS testen.
- Die Challenge startet am 12.10.2026, die App läuft dann aber noch nicht auf dem Server. Alle tragen ihre Tage bis zum Go-live nach, das zählt voll.
- In der Git-Historie stehen in alten Commits noch Pfade mit Bezug zu Firmenwerkzeugen. Umschreiben (Force-Push) nur nach ausdrücklichem Ja.
