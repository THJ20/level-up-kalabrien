# Plan 3 · API, Live-Updates, Push und Zeitsteuerung · Implementation Plan

> **Umsetzung:** Task für Task, testgetrieben. Schnittstellen und Testfälle sind verbindlich, der Code entsteht in der Umsetzung (Test zuerst, dann Implementierung, dann Commit).

**Goal:** Die Dienste aus Plan 2 über eine JSON-API erreichbar machen, Live-Updates per Server-Sent Events liefern, Web-Push-Benachrichtigungen verschicken und die zeitgesteuerten Abläufe (Mitternacht, Erinnerungen, Snapshots) betreiben.

**Architecture:** Ein App-Objekt (`src/lib/server/app.ts`) bündelt Konfiguration, `ServiceContext`, Login-Bremse und Scheduler. `hooks.server.ts` startet es im `init`-Hook und prüft in `handle` die Sitzung. Endpunkte unter `src/routes/api/**/+server.ts` sind dünne Hüllen: Eingabe mit zod prüfen, Dienst aufrufen, JSON zurückgeben, `ServiceError` in HTTP-Status übersetzen. Push läuft über einen austauschbaren Transport, damit Tests ohne Netz auskommen.

**Tech Stack:** SvelteKit 3 Endpunkte und Hooks, zod 4, web-push 3.6, croner 10, better-sqlite3 `VACUUM INTO` für Snapshots.

## Global Constraints

- Alle Constraints aus Plan 1 und 2 gelten weiter.
- Sitzungs-Cookie `session`: HttpOnly, SameSite `lax`, Pfad `/`, `secure` außer auf `http://localhost`, Laufzeit wie die Sitzung.
- Alle Endpunkte außer `/api/auth/*` und `/api/push/key` verlangen eine gültige Sitzung (sonst 401). Admin-Endpunkte prüfen die Rolle im Dienst (403).
- Fehlerantwort immer `{ "error": { "code": "<ErrorCode>", "message": "<deutscher Text>" } }` mit dem Status aus `ERROR_STATUS`. Ungültige Eingaben (zod) ergeben `invalid_input` mit 400.
- Konfiguration nur über Umgebungsvariablen: `DATABASE_PATH` (Standard `data/app.db`), `BACKUP_DIR` (Standard `data/backups`), `GO_LIVE_DATE` (optional), `ORIGIN` (öffentliche URL, z. B. `https://levelup.example.de`), `VAPID_SUBJECT` (optional, sonst `ORIGIN`).
- VAPID-Schlüssel werden beim ersten Start erzeugt und in `settings` gespeichert.
- Zeitgesteuerte Jobs in `Europe/Berlin`: `0 0 * * *` Auswertung, `* * * * *` Abenderinnerungen, `0 18 * * *` Abstimmungs-Erinnerungen, `0 3 * * *` Snapshot (14 Tage aufbewahren). Beim Start: Go-live sichern, Admin-Einladung ausgeben (falls noch kein Hunter), Auswertung nachholen.

## Endpunkte

| Methode und Pfad | Dienst |
|---|---|
| `GET /api/auth/invite?token=` | Einladung prüfen (`{ valid, role }`) |
| `POST /api/auth/register` | `redeemInvite`, setzt Cookie |
| `POST /api/auth/login` | `login`, setzt Cookie |
| `POST /api/auth/logout` | `invalidateSession`, löscht Cookie |
| `GET /api/me`, `PATCH /api/me` | `hunterSummary` plus Einstellungen, `updateProfile` |
| `GET /api/me/settings`, `PATCH /api/me/settings` | `getSettings`, `updateSettings` |
| `GET /api/board` | `todayBoard` |
| `GET /api/days/[date]` | `dayDetail` für mich |
| `POST /api/sets`, `PATCH /api/sets/[id]`, `DELETE /api/sets/[id]` | Sätze |
| `PUT /api/sick/[date]`, `DELETE /api/sick/[date]` | Krankmeldung |
| `GET /api/exercises`, `POST /api/exercises`, `PATCH /api/exercises/[id]`, `DELETE /api/exercises/[id]` | Katalog (DELETE archiviert) |
| `POST /api/bonus`, `PATCH /api/bonus/[id]`, `DELETE /api/bonus/[id]` | Bonus-Einträge |
| `GET /api/penalties`, `POST /api/penalties`, `PATCH /api/penalties/[id]`, `DELETE /api/penalties/[id]` | Strafkatalog (DELETE archiviert) |
| `GET /api/votes?status=open\|all` | `listVotes` |
| `POST /api/votes/[id]/ballot`, `POST /api/votes/[id]/proposals` | `castBallot`, `proposePenalty` |
| `GET /api/verdicts?hunter=` | `listVerdicts` |
| `GET /api/feed?before=&limit=`, `POST /api/feed/[id]/reactions` | `listFeed`, `toggleReaction` |
| `GET /api/leaderboard?from=&to=` | `leaderboard` |
| `GET /api/hunters`, `GET /api/hunters/[id]` | aktive Hunter, `hunterProfile` |
| `GET /api/stats?from=&to=&hunters=a,b` | `stats` |
| `GET /api/push/key`, `POST /api/push/subscription`, `DELETE /api/push/subscription` | VAPID-Schlüssel, Abo speichern und löschen |
| `GET /api/events` | SSE-Strom mit `event: change` und den Themen als JSON |
| `POST /api/admin/invites` | Einladungslink erzeugen |
| `POST /api/admin/hunters/[id]/deactivate` | `deactivateHunter` |
| `GET /api/admin/backup` | aktuellen Snapshot herunterladen |

---

### Task 1: Konfiguration und App-Kontext

**Files:** `src/lib/server/config.ts`, `src/lib/server/app.ts`, `src/lib/server/vapid.ts`; Test `app.test.ts`

**Interfaces:**
- `interface AppConfig { databasePath; backupDir; goLiveDate: LocalDate | null; origin: string | null; vapidSubject: string }`, `loadConfig(env: Record<string, string | undefined>): AppConfig`
- `interface VapidKeys { publicKey; privateKey }`, `ensureVapidKeys(ctx, generate?): VapidKeys`
- `interface App { config; ctx: ServiceContext; throttle: LoginThrottle; vapid: VapidKeys; stop(): void }`
- `createApp(config, deps?: { clock?; transport?; startJobs?: boolean; log?: (line) => void }): App` (öffnet DB, Go-live, VAPID, Notifier, Admin-Einladung als Link im Log, Auswertung nachholen, Scheduler starten)
- `getApp(): App` (einmalig aus `process.env`), `setApp(app)` für Tests

**Testfälle:** Konfiguration mit Standardwerten und ungültigem `GO_LIVE_DATE`; VAPID-Schlüssel werden einmal erzeugt und danach wiederverwendet; `createApp` mit Speicher-DB gibt den Admin-Link genau beim ersten Start aus und holt verpasste Tage nach.

### Task 2: Push und Erinnerungen

**Files:** `src/lib/server/push.ts`, `src/lib/server/reminders.ts`; Tests

**Interfaces:**
- `interface PushTransport { send(subscription: { endpoint; keys: { p256dh; auth } }, payload: string): Promise<{ statusCode: number }> }`, `webPushTransport(vapid, subject): PushTransport`
- `savePushSubscription(ctx, hunterId, { endpoint, keys })`, `removePushSubscription(ctx, hunterId, endpoint)`
- `class PushNotifier implements Notifier` (filtert nach `pushEnabled` und der Art: `reminder` braucht `reminderEnabled`, `vote` braucht `votePushEnabled`; löscht Abos bei 404/410; Fehler werden geloggt, nie geworfen) mit `flush(): Promise<void>` für Tests
- `sendEveningReminders(ctx): string[]` (aktive Hunter mit Push und Erinnerung, Uhrzeit erreicht, heute noch nicht erinnert, heute Challenge-Tag und Status `open`), `sendVoteReminders(ctx): string[]`

**Testfälle:** Abo speichern, gleicher Endpunkt aktualisiert, löschen nur eigene; Notifier schickt nur an erlaubte Hunter und entfernt abgelaufene Abos; Abenderinnerung nur einmal pro Tag, nicht vor der Uhrzeit, nicht bei erfüllter Quest oder Krankmeldung; Abstimmungs-Erinnerung an Stimmberechtigte ohne Stimme.

### Task 3: Snapshots und Scheduler

**Files:** `src/lib/server/backup.ts`, `src/lib/server/scheduler.ts`; Tests

**Interfaces:**
- `createSnapshot(ctx, dir, fileName): string` (Pfad), `dailySnapshot(ctx, dir, keep = 14): string`, `pruneSnapshots(dir, keep)`
- `SCHEDULE` (Muster je Job), `startScheduler(app): () => void`

**Testfälle:** Snapshot ist eine lesbare SQLite-Datei mit denselben Hunters; nur die neuesten 14 Tages-Snapshots bleiben; `SCHEDULE` enthält die vier Muster.

### Task 4: HTTP-Grundlage und Login-Endpunkte

**Files:** `src/lib/server/http.ts`, `src/hooks.server.ts`, `src/app.d.ts`, `src/routes/api/auth/**`, Test-Helfer `src/lib/server/http-testing.ts`; Tests

**Interfaces:**
- `api(handler: (event, hunter) => unknown | Promise<unknown>)` und `publicApi(handler)` (Fehlerübersetzung, JSON-Antwort, 401 ohne Sitzung)
- `parseJson(event, schema)`, `parseQuery(event, schema)`
- `setSessionCookie(event, session)`, `clearSessionCookie(event)`
- `App.Locals { hunter: HunterProfile | null; sessionToken: string | null }`
- Test-Helfer `fakeEvent({ method, path, body?, token?, params? })`

**Testfälle:** Registrierung setzt Cookie und liefert Hunter; Login falsch 401, richtig 200 mit Cookie; Logout löscht Sitzung; geschützter Endpunkt ohne Sitzung 401; `ServiceError` wird zu Status und Fehlerobjekt; zod-Fehler werden zu 400.

### Task 5: Fach-Endpunkte

**Files:** alle übrigen `src/routes/api/**/+server.ts`; Test `api.test.ts`

**Testfälle (Stichproben über die Hüllen):** Satz anlegen und Tagesdetail lesen; Krankmeldung per PUT; Bonus mit Katalog-Übung; Strafe anlegen, Abstimmung abgeben; Feed lesen und reagieren; Rangliste und Statistik mit Zeitraum; Admin-Einladung nur für Admin; Push-Abo speichern.

### Task 6: Live-Updates

**Files:** `src/routes/api/events/+server.ts`, `src/lib/server/sse.ts`; Test

**Interfaces:** `createEventStream(bus, signal, heartbeatMs = 25_000): ReadableStream<Uint8Array>` (schreibt `event: ready`, dann bei jeder Änderung `event: change` mit den Themen, Kommentar-Heartbeat, meldet sich beim Abbruch vom Bus ab)

**Testfälle:** Stream beginnt mit `ready`, liefert veröffentlichte Themen, meldet sich nach Abbruch ab.

### Task 7: Gesamtprüfung und API-Doku

- [ ] `docs/api.md` mit allen Endpunkten, Eingaben und Antworten
- [ ] `npm test`, `npm run check`, `npm run build` grün, App startet lokal mit `npm run dev` und gibt den Admin-Link aus
- [ ] Merge nach `main`, Push
