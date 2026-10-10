# Level Up · Kalabrien

Private Web-App für eine Sport-Challenge unter Freunden. Jeder erfüllt jeden Tag seine Daily Quest, also seinen eigenen Trainingsplan, vom 12.10.2026 bis zum Abflug nach Kalabrien am 29.04.2027. Wer dranbleibt, steigt im Level auf und erreicht kurz vor der Reise den S-Rang. Wer einen Tag verpasst, bekommt per Abstimmung eine Strafe.

Der Look ist an das System-Interface eines Dark-Fantasy-Manhwas angelehnt (Variante „Shadow Monarch“, dunkel und violett). Die App nutzt keine Originalgrafiken und keine Namen aus der Vorlage.

> Privates Projekt für 2 bis 5 Personen. Nicht zur Weitergabe gedacht.

## Was die App kann

- **Eigener Trainingsplan** pro Spieler, jeden Tag gleich, mit Übungen in Wiederholungen, Minuten oder Kilometern. Import über einen Prompt für die eigene KI, Erkennung direkt im Browser
- **Daily Quest** nach dem Plan, Einträge in Einzelsätzen, Nachtragen vergangener Tage und Krankmeldung, drei Aufwärmtage ohne Wertung
- **Level und Rang** von E bis S, 100 XP pro erfülltem Tag, Statusfenster für jeden Spieler
- **Zusatzübungen** aus einem gemeinsamen Katalog. Sie geben Bonuspunkte nach Dauer mal Anstrengung, als eigene Wertung neben dem Level
- **Statistik** mit Zeitraumfiltern und Diagrammen
- **Rangliste** nach Level, Bonuspunkten und Streak
- **Live-Feed** mit Reaktionen. Neue Einträge der anderen erscheinen sofort
- **Strafen:** Ein verpasster Tag wird rot markiert und startet eine Abstimmung über den Strafkatalog. Das Strafbuch hält die Urteile fest
- **28 Badges** in fünf Gruppen mit eigenen Icons und einer Erfolge-Seite, auf der man auch die Badges der anderen sieht
- **Profil** mit Spielername, Profilbild (eigenes Foto oder einer von acht Avataren) und zwei Farbschemata (Shadow Monarch violett, Gate orange)
- **Push-Benachrichtigungen** für die Abenderinnerung und offene Abstimmungen, einzeln abschaltbar
- **Installierbar als App** (PWA) auf iPhone, Android und Desktop. Einträge ohne Netz werden gesammelt und später gesendet
- **Login nur per Einladung**, Verwaltung der Spieler durch den Admin

## Stand

| Teil | Status |
|---|---|
| Plan 1 bis 4: Spielregeln, Server, API, Oberfläche | fertig |
| Überarbeitung 1 (Plan 6): eigener Trainingsplan pro Spieler, Start am Mo 12.10.2026, Spielername und Profilbild, Farbschemata, Erfolge-Seite | fertig |
| Plan 5: Betrieb auf eigenem Server, Abnahme auf echten Geräten, Go-live | offen |

Den genauen Stand, alle Regeln und die offenen Punkte beschreibt [docs/uebergabe.md](docs/uebergabe.md).

## Technik

- [SvelteKit 3](https://svelte.dev) mit Svelte 5 und adapter-node, TypeScript, Vite
- SQLite über better-sqlite3 und Drizzle ORM, Migrationen sind in den Build eingebettet
- Argon2 für Passwörter, web-push für Benachrichtigungen, croner für die Zeitsteuerung
- ECharts für die Statistik, Lucide für Icons, Schriften Oxanium und Barlow selbst gehostet
- Vitest für Tests, Playwright (mit Edge) für Screenshots

Die Zeitzone ist fest Europe/Berlin. Tagesgrenzen stimmen auch bei der Zeitumstellung.

## Projektstruktur

```
src/
  lib/domain/      Spielregeln ohne Abhängigkeiten (Kalender, Quest, Level, Streak, Badges, Abstimmung)
  lib/server/      Datenbank, Login, Spieldienste, Push, Scheduler, Backups
  lib/client/      Hilfen für die Oberfläche (API, Offline-Warteschlange, Diagramme)
  lib/ui/          Svelte-Komponenten und Designsystem
  routes/(app)/    Seiten: Quest, Statistik, Rangliste, Feed, Strafen, Profil
  routes/api/      JSON-API, Live-Updates per SSE unter /api/events
  service-worker/  Offline-Cache und Push-Empfang
scripts/           Testdaten, Icons, Screenshots
docs/              Spezifikation, Umsetzungspläne, API, Übergabe
```

## Lokal starten

Voraussetzung ist Node.js 24 oder neuer.

```bash
npm install
npm run dev
```

Die App läuft dann unter http://localhost:5173. Beim allerersten Start legt der Server die Datenbank an und schreibt einen Einladungslink für den Admin ins Log. Wer ihn öffnet, registriert sich als Admin und lädt die anderen ein.

**Testdaten:** Mit dem Admin-Token aus dem Log legt `node scripts/seed-dev.mjs <Admin-Token> [URL]` vier Test-Spieler mit Plänen, Avataren und Einträgen an. Das Testpasswort steht im Skript. `node scripts/dev-vote.mjs [URL]` erzeugt zusätzlich eine offene Abstimmung. Damit schon gewertete Tage da sind, startet man den Server dafür mit `SIMULATED_NOW=2026-10-20T19:00:00+02:00` und `GO_LIVE_DATE=2026-10-12`.

**Produktions-Build lokal testen:**

```bash
npm run build
DATABASE_PATH=data/dev.db PORT=5180 ORIGIN=http://localhost:5180 node build/index.js
```

In PowerShell setzt man die Variablen vorher mit `$env:DATABASE_PATH='data/dev.db'` usw.

## Konfiguration

| Variable | Bedeutung | Standard |
|---|---|---|
| `DATABASE_PATH` | Pfad zur SQLite-Datei | `data/app.db` |
| `BACKUP_DIR` | Ordner für die nächtlichen Backups | `backups` neben der Datenbank |
| `GO_LIVE_DATE` | Erster gewerteter Tag im Format `JJJJ-MM-TT` | keiner |
| `ORIGIN` | Öffentliche Adresse der App, z. B. `https://levelup.example.de` | keiner |
| `PORT` | Port des Node-Servers | `3000` |
| `VAPID_SUBJECT` | Kontakt für Web Push | `ORIGIN` |
| `AVATAR_DIR` | Ordner für hochgeladene Profilbilder | `avatars` neben der Datenbank |
| `SIMULATED_NOW` | Nur zum Ausprobieren: Die App tut so, als wäre es dieser Zeitpunkt, z. B. `2026-10-20T19:00:00+02:00` | keiner |

Die Schlüssel für Web Push erzeugt der Server beim ersten Start selbst und speichert sie in der Datenbank. Push und Installation als App funktionieren auf echten Geräten nur über HTTPS.

## Prüfen

```bash
npm test
npx svelte-check --tsconfig ./tsconfig.json
npm run build
```

`npm run check` und `npm run build` nicht laufen lassen, während `npm run dev` läuft. Der Dev-Server bleibt sonst hängen.

**Screenshots aller Seiten** auf Handy- und Desktop-Breite macht `node scripts/screenshots.mjs <Ordner> <URL> [Hunter]`. Das Skript braucht einen installierten Microsoft Edge.

**Logo, Icons und Avatare:** `node scripts/cut-logo.mjs` und `node scripts/generate-icons.mjs` erzeugen App-Icons und das Logo in der App aus `assets/logo`, `node scripts/cut-avatars.mjs` schneidet die Avatare aus `assets/avatars`.

## Hinweise zu SvelteKit 3

- Es gibt keine `svelte.config.js` mehr. Die Konfiguration steht in `vite.config.ts`.
- `$lib` gibt es nicht mehr. Importe aus `src/lib` laufen über `#lib/...` mit Dateiendung, z. B. `#lib/domain/index.ts`.
- Typen für Hooks kommen aus `@sveltejs/kit/hooks`.

## Dokumentation

- [Übergabe und Stand](docs/uebergabe.md)
- [Spezifikation](docs/specs/2026-10-09-level-up-kalabrien-design.md) und [Überarbeitung 1](docs/specs/2026-10-10-ueberarbeitung-1-design.md)
- [Roadmap der Umsetzungspläne](docs/plans/2026-10-09-00-roadmap.md)
- [API](docs/api.md)
- [Spielregeln im Code](src/lib/domain/README.md)
