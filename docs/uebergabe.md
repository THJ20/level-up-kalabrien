# Level Up · Kalabrien · Stand und Übergabe

Stand 10.10.2026. Dieses Dokument reicht, um in einer neuen Session ohne Vorwissen weiterzuarbeiten.

## Worum es geht

- Private Web-App (PWA) für eine Gruppe von 2 bis 5 Leuten.
- Jeden Tag 100 Liegestütze, 100 Kniebeugen und 100 Sit-ups/Crunches, vom 09.10.2026 (Tag 1) bis zum 28.04.2027 (Tag 202).
- Ziel ist der Abflug zur Reise nach Kalabrien am 29.04.2027, der Countdown läuft dorthin.
- Look „Shadow Monarch“, angelehnt an das System aus Solo Leveling, aber ohne Originalgrafiken, Logos oder Namen. System-Meldungen sind englisch, alles andere deutsch.
- Komplett privat. Im Repo steht nichts mit Bezug zum Arbeitgeber oder zu Firmenwerkzeugen.

## Wo alles liegt

- Code lokal: `C:\Users\TobiasHeinze\Documents\level-up-kalabrien`
- GitHub privat: https://github.com/THJ20/level-up-kalabrien (Branch `main`)
- Spezifikation: `docs/specs/2026-10-09-level-up-kalabrien-design.md`
- Roadmap und Pläne: `docs/plans/` (Roadmap `00`, Pläne `01` bis `04` erledigt)
- API-Doku: `docs/api.md`
- Git-Identität (nur in diesem Repo): Tobias Heinze <heinze.tobias20@gmail.com>
- GitHub-CLI: `C:\Program Files\GitHub CLI\gh.exe` (nicht im PATH), angemeldet als THJ20

## Spielregeln, wie entschieden

**Tage**
- Jeder Tag hat einen von fünf Zuständen: erfüllt, krank, offen (heute), nicht gewertet, verpasst.
- Ausgewertet wird um Mitternacht deutscher Zeit.
- Tage vor dem Go-live-Datum oder vor der eigenen Registrierung werden nie gewertet.

**Verpasste Tage und Strafen**
- Ein verpasster Tag ist für alle sichtbar rot, und es startet eine Strafabstimmung.
- Abstimmen dürfen alle außer dem Betroffenen. Die Abstimmung endet erst, wenn alle abgestimmt haben. Bei Gleichstand entscheidet das Los.
- Den Strafkatalog pflegen alle Hunter. Das Strafbuch dokumentiert nur, erledigt werden die Strafen außerhalb der App.

**Nachtragen und Krankmeldung**
- Nachtragen geht unbegrenzt. Ein Nachtrag oder eine Krankmeldung hebt die Abstimmung auf und auch eine schon verhängte Strafe.
- Krankmelden geht unbegrenzt und auch rückwirkend. Ein Kranktag bringt kein XP und pausiert den Streak, ohne ihn zu brechen.

**Level und Rang**
- XP gibt es nur für erfüllte Daily Quests, 100 XP pro Tag.
- Die Level-Kurve ist q(L) = 195 × ((L minus 1) / 49) hoch 1,6.
- Ränge: E (Level 1 bis 9), D (10 bis 19), C (20 bis 29), B (30 bis 39), A (40 bis 49), S (ab Level 50, das ist Quest 195 bzw. der 21.04.2027 bei durchgehender Erfüllung).
- Level 51 gibt es nur mit allen 202 Tagen.

**Bonuspunkte**
- Bonuspunkte sind eine eigene Wertung, getrennt vom Level.
- Berechnet werden sie als Minuten mal Anstrengungsstufe (Session-RPE nach Foster): locker 3, moderat 5, hart 7, am Limit 9.
- Wiederholungs-Übungen werden über Sekunden pro Wiederholung in Minuten umgerechnet. Wiederholungen über 100 bei den Pflichtübungen zählen mit (3 Sekunden, Stufe hart).
- Den Übungskatalog pflegen alle gemeinsam. Er startet mit 15 Übungen.

**Badges, Push und Login**
- Es gibt 31 Badges in fünf Gruppen: Durchhalten, Rang, Volumen, Bonus und Spaß.
- Push-Benachrichtigungen gibt es für die Abenderinnerung (Uhrzeit wählbar, Standard 20:00), für gestartete Abstimmungen und als tägliche Erinnerung um 18:00 an offene Stimmen. Alles ist abschaltbar.
- Login nur per Einladungslink (7 Tage gültig, einmal nutzbar) und Passwort mit mindestens 10 Zeichen. Admin ist Tobias. Man bleibt 180 Tage eingeloggt, nach 5 Fehlversuchen ist der Login 15 Minuten gesperrt.

## Technik

- SvelteKit 3, Svelte 5 (Runes), Vite 8, TypeScript 6, Node 24.
- Datenbank: SQLite (better-sqlite3) mit Drizzle und eingebetteten Migrationen.
- Weitere Bausteine: Argon2, web-push, croner, zod, ECharts, idb-keyval, Playwright (mit Edge, ohne Browser-Download).
- Besonderheiten von SvelteKit 3:
  - Es gibt keine `svelte.config.js` mehr, die Konfiguration steht in `vite.config.ts`.
  - Importe aus `src/lib` laufen über `#lib/...` mit `.ts`-Endung, z. B. `#lib/domain/index.ts`.
  - Die Hook-Typen kommen aus `@sveltejs/kit/hooks`.
  - `goto` kennt jetzt `replace`, `reset` und `refreshAll`.
- Struktur:
  - `src/lib/domain` enthält die reinen Spielregeln.
  - `src/lib/server` enthält Dienste, Datenbank, Login, Push, Scheduler und Backups.
  - `src/routes/api` ist die JSON-API, `src/routes/(app)` sind die Seiten.
  - `src/lib/ui` und `src/lib/client` gehören zur Oberfläche, `src/service-worker` ist der Service Worker.
- Prüfen: `npm test` (206 Tests), `npx svelte-check --tsconfig ./tsconfig.json`, `npm run build`.

## Lokal starten und testen

1. `npm run build`
2. Starten mit `DATABASE_PATH=data/dev.db`, `PORT=5180` und `ORIGIN=http://localhost:5180`, dann `node build/index.js`. Beim allerersten Start steht ein Admin-Einladungslink im Log.
3. Testdaten anlegen: `node scripts/seed-dev.mjs <Admin-Token> <URL>` legt Tobias (Admin), Niklas, Ramzy und Steffen an. Das Testpasswort steht im Skript.
4. `node scripts/dev-vote.mjs` erzeugt eine offene Abstimmung zum Ansehen.
5. `node scripts/screenshots.mjs <Ordner> <URL>` macht Screenshots aller Seiten auf Handy- und Desktop-Breite.
6. Nie `npm run check` oder `vite build` laufen lassen, während der Dev-Server läuft. Das bringt ihn zum Hängen.

## Offen

- **Plan 5 Betrieb und Abnahme** (noch nicht geschrieben):
  - Dockerfile und docker-compose mit Datenvolume
  - HTTPS über Caddy
  - Sicherheits-Checkliste für Niklas: vor der Installation Firewall nur auf 22, 80 und 443, dazu automatische Updates und SSH nur per Schlüssel
  - Playwright-Abläufe
  - Abnahme auf echtem iPhone und Android-Handy
  - Go-live mit `GO_LIVE_DATE`
  - **Pflicht vor dem Go-live:** Das App-Icon, das Tobias später liefert, muss in den Push-Benachrichtigungen erscheinen wie bei normalen Apps. Dazu gehören das große Icon (`icon`), ein einfarbiges Status-Icon für Android (`badge`, weiße Silhouette auf transparent) und die Homescreen-Icons, die iOS für Benachrichtigungen nutzt. Auf iPhone und Android prüfen.
- **Wartet auf Niklas**, denn die App soll auf seinem Server laufen. Folgende Fragen sind offen:
  1. Betriebssystem, Docker und Docker Compose
  2. Reverse Proxy für HTTPS
  3. Domain oder Subdomain
  4. SSH-Zugang oder Deployment durch ihn
  5. Backups
  6. Freier RAM und Speicher (die App braucht etwa 256 MB RAM und unter 1 GB Platte)
  7. GitHub-Account für den Repo-Zugriff
- Push-Benachrichtigungen und der Offline-Modus lassen sich erst auf echten Handys mit HTTPS testen.
- In der Git-Historie stehen in alten Commits noch Pfade mit Bezug zu Firmenwerkzeugen. Umschreiben (Force-Push) nur nach ausdrücklichem Ja.
