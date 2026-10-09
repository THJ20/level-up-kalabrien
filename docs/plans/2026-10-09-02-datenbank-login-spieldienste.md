# Plan 2 · Datenbank, Login und Spieldienste · Implementation Plan

> **Umsetzung:** Task für Task, testgetrieben. Schnittstellen, Tabellen, Regeln und Testfälle in diesem Plan sind verbindlich. Der Code entsteht in der Umsetzung Schritt für Schritt: erst die genannten Tests schreiben und fehlschlagen sehen, dann implementieren, dann grün, dann committen.

**Goal:** Alle serverseitigen Daten und Spieldienste der Spezifikation, getestet gegen eine SQLite-Datenbank im Speicher.

**Architecture:** Alles liegt unter `src/lib/server/`. Die Dienste sind synchrone Funktionen mit einem `ServiceContext` (Datenbank, Uhr, Benachrichtiger, Änderungsbus, Zufall), damit Tests Uhrzeit und Nebenwirkungen kontrollieren. Spielregeln kommen ausschließlich aus `#lib/domain/index.ts`. Jede Änderung an Sätzen, Krankmeldungen oder Bonus-Einträgen läuft durch eine Pipeline, die Feed-Ereignisse, verpasste Tage, Abstimmungen und Badges nachzieht. HTTP, Push-Versand, Scheduler und SSE folgen in Plan 3.

**Tech Stack:** better-sqlite3 13, drizzle-orm 0.45 (Abfragen), drizzle-kit 0.31 (Migrationen erzeugen), eingebetteter Migrations-Runner über `import.meta.glob`, @node-rs/argon2 (Passwörter), node:crypto (Tokens), Vitest.

**Spezifikation:** `docs/specs/2026-10-09-level-up-kalabrien-design.md`, Abschnitte 3, 4, 5 (Datenbedarf), 7, 8.

## Global Constraints

- Alle Global Constraints aus Plan 1 gelten weiter (Zeitzone Europe/Berlin, Challenge 09.10.2026 bis 28.04.2027, Formeln, Commit-Trailer, PowerShell, LF).
- Spielregeln nur über `#lib/domain/index.ts`, keine zweite Implementierung von Tagesstatus, Level, BP oder Badges.
- SvelteKit 3 kennt `$lib` nicht mehr. Importe aus `src/lib` laufen über Subpath-Imports aus der `package.json` (`"#lib/*": "./src/lib/*"`) mit Dateiendung, z. B. `#lib/domain/index.ts`.
- Kein Dienst ruft `new Date()` ohne Argument auf, die Zeit kommt aus `ctx.clock.now()`.
- IDs sind `crypto.randomUUID()`. Kalendertage werden als Text `JJJJ-MM-TT` gespeichert, Zeitpunkte als Millisekunden (`integer` mit `mode: 'timestamp_ms'`).
- Fehler werfen `ServiceError` mit Code `invalid_input`, `unauthorized`, `forbidden`, `not_found`, `conflict` oder `locked`. Meldungstexte sind deutsch.
- Nur eigene Sätze, Krankmeldungen und Bonus-Einträge sind änderbar. Einträge in der Zukunft oder außerhalb der Challenge-Tage werden abgelehnt.
- Passwörter mindestens 10 Zeichen, Argon2id. Session- und Einladungs-Tokens 32 Byte zufällig, gespeichert wird nur der SHA-256-Hash.
- Im Repo nichts mit Bezug zum Arbeitgeber oder zu Firmenwerkzeugen.

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `drizzle.config.ts` | Konfiguration für `drizzle-kit generate` |
| `src/lib/server/clock.ts` | `Clock`, `systemClock` |
| `src/lib/server/errors.ts` | `ServiceError`, HTTP-Status je Code |
| `src/lib/server/db/schema.ts` | Alle Tabellen |
| `src/lib/server/db/migrations/` | Von drizzle-kit erzeugte SQL-Migrationen |
| `src/lib/server/db/migrate.ts` | Eingebetteter Migrations-Runner |
| `src/lib/server/db/client.ts` | `openDatabase(path)` mit Pragmas, Migrationen, Startkatalog |
| `src/lib/server/db/seed.ts` | Startkatalog der Bonusübungen |
| `src/lib/server/context.ts` | `ServiceContext`, `Notifier`, `ChangeBus`, `todayOf(ctx)` |
| `src/lib/server/testing.ts` | Test-Kontext mit Speicher-DB, steuerbarer Uhr, Aufzeichnung von Push und Bus |
| `src/lib/server/settings.ts` | Go-live-Datum |
| `src/lib/server/hunters.ts` | Profile, Einstellungen, Wertungsbeginn, Deaktivierung |
| `src/lib/server/auth/*.ts` | Passwörter, Tokens, Sitzungen, Einladungen, Login-Bremse, Login |
| `src/lib/server/records.ts` | Rohdaten eines Hunters für das Domänenmodul laden |
| `src/lib/server/feed.ts` | Feed-Ereignisse, Aktivitäts-Bündelung, Reaktionen |
| `src/lib/server/pipeline.ts` | Änderungs-Pipeline |
| `src/lib/server/quest.ts` | Sätze und Krankmeldungen |
| `src/lib/server/penalties.ts` | Strafkatalog |
| `src/lib/server/votes.ts` | Verpasste Tage, Abstimmungen, Strafbuch |
| `src/lib/server/badges.ts` | Badge-Abgleich |
| `src/lib/server/bonus.ts` | Bonus-Katalog und Bonus-Einträge |
| `src/lib/server/overview.ts` | Zusammenfassungen für Startseite, Rangliste, Statusfenster, Statistik |

## Tabellen

| Tabelle | Spalten (Auszug) | Schlüssel und Indizes |
|---|---|---|
| `hunters` | `id`, `name`, `name_key` (klein geschrieben), `color`, `password_hash`, `role` (`admin`/`hunter`), `active`, `registered_on` (Tag), `created_at`, `push_enabled`, `reminder_enabled`, `reminder_time` (`HH:MM`, Standard `20:00`), `vote_push_enabled`, `sound_enabled`, `last_reminder_on` | PK `id`, unique `name_key` |
| `sessions` | `id` (Token-Hash), `hunter_id`, `expires_at` | PK `id` |
| `invites` | `id`, `token_hash`, `role`, `created_by`, `created_at`, `expires_at`, `used_at`, `used_by` | unique `token_hash` |
| `settings` | `key`, `value` | PK `key` |
| `quest_sets` | `id`, `hunter_id`, `date`, `exercise`, `reps`, `recorded_at`, `client_id` | Index (`hunter_id`, `date`), unique (`hunter_id`, `client_id`) |
| `sick_notes` | `id`, `hunter_id`, `date`, `recorded_at` | unique (`hunter_id`, `date`) |
| `exercises` | `id`, `name`, `kind` (`time`/`reps`), `seconds_per_rep`, `tracks_distance`, `is_running`, `created_by` (null = Startkatalog), `archived`, `created_at` | PK `id` |
| `bonus_entries` | `id`, `hunter_id`, `exercise_id`, `date`, `minutes`, `reps`, `effort`, `distance_km`, `bonus_points`, `recorded_at`, `client_id` | Index (`hunter_id`, `date`), unique (`hunter_id`, `client_id`) |
| `penalties` | `id`, `title`, `description`, `created_by`, `archived`, `created_at` | PK `id` |
| `missed_days` | `id`, `hunter_id`, `date`, `status` (`active`/`lifted`), `lift_reason`, `created_at`, `lifted_at` | unique (`hunter_id`, `date`) nur für `status = 'active'` |
| `votes` | `id`, `missed_day_id`, `offender_id`, `date`, `status` (`open`/`closed`/`cancelled`), `created_at`, `closed_at`, `winner_penalty_id`, `decided_by_lot` | unique `missed_day_id` |
| `vote_voters` | `vote_id`, `hunter_id` | PK (`vote_id`, `hunter_id`) |
| `ballots` | `vote_id`, `voter_id`, `penalty_id`, `cast_at` | PK (`vote_id`, `voter_id`) |
| `verdicts` | `id`, `vote_id`, `hunter_id`, `date`, `penalty_id`, `decided_at`, `decided_by_lot`, `status` (`imposed`/`lifted`), `lift_reason`, `lifted_at` | unique `vote_id` |
| `feed_events` | `id`, `type`, `hunter_id`, `payload` (JSON), `bucket`, `created_at` | Index `created_at`, unique `bucket` |
| `reactions` | `event_id`, `hunter_id`, `reaction` | PK (`event_id`, `hunter_id`, `reaction`) |
| `hunter_badges` | `hunter_id`, `badge_id`, `earned_at` | PK (`hunter_id`, `badge_id`) |
| `push_subscriptions` | `id`, `hunter_id`, `endpoint`, `p256dh`, `auth`, `created_at` | unique `endpoint` |

---

### Task 1: Datenbank, Migrationen und Test-Kontext

**Files:** `drizzle.config.ts`, `src/lib/server/clock.ts`, `errors.ts`, `context.ts`, `testing.ts`, `db/schema.ts`, `db/migrate.ts`, `db/client.ts`, `db/seed.ts`, `db/migrations/*`; Test `src/lib/server/db/client.test.ts`

**Interfaces (Produces):**
- `interface Clock { now(): Date }`, `systemClock`
- `class ServiceError extends Error { code: ErrorCode }`, `ERROR_STATUS: Record<ErrorCode, number>` (400, 401, 403, 404, 409, 429)
- `type AppDb`, `openDatabase(path: string, now?: Date): AppDb` (Pragmas `journal_mode=WAL` außer bei `:memory:`, `foreign_keys=ON`, `busy_timeout=5000`, dann `runMigrations`, dann `seedCatalog`)
- `runMigrations(sqlite: Database.Database): void` (liest `migrations/meta/_journal.json` und die SQL-Dateien per `import.meta.glob(..., { query: '?raw', eager: true })`, führt neue Migrationen in Reihenfolge aus, merkt sie in `__migrations`)
- `START_CATALOG`, `seedCatalog(db: AppDb, now: Date): void` (nur wenn `exercises` leer)
- `interface Notification { title: string; body: string; url: string; tag?: string }`, `type NotificationKind = 'reminder' | 'vote'`, `interface Notifier { notify(hunterIds: readonly string[], notification: Notification, kind: NotificationKind): void }`
- `type ChangeTopic = 'board' | 'feed' | 'votes' | 'hunters' | 'catalog'`, `interface ChangeBus { publish(topics: readonly ChangeTopic[]): void; subscribe(listener: (topics: readonly ChangeTopic[]) => void): () => void }`, `createChangeBus()`
- `interface ServiceContext { db: AppDb; clock: Clock; notifier: Notifier; bus: ChangeBus; random: (count: number) => number }`, `todayOf(ctx): LocalDate`
- Test: `createTestContext(nowIso?: string): TestContext` mit `clock.set(iso)`, `clock.advance(ms)`, `notifier.sent`, `bus.published`, `insertHunter(ctx, name, options?)`

**Testfälle:**
- Migrationen legen alle Tabellen an und sind beim zweiten Lauf ein No-op.
- Der Startkatalog wird genau einmal eingespielt (15 Übungen, Laufen mit `is_running`).
- Fremdschlüssel sind aktiv (Satz für unbekannten Hunter scheitert).
- `todayOf` liefert den Berliner Kalendertag der Test-Uhr.

### Task 2: Login, Sitzungen und Einladungen

**Files:** `src/lib/server/auth/password.ts`, `tokens.ts`, `sessions.ts`, `invites.ts`, `throttle.ts`, `login.ts`, `src/lib/server/hunters.ts` (Basis), `src/lib/server/settings.ts`; Tests je Datei

**Interfaces (Produces):**
- `validatePassword(pw: string): void`, `hashPassword(pw): Promise<string>`, `verifyPassword(hash, pw): Promise<boolean>`
- `generateToken(): string` (base64url), `hashToken(token): string` (SHA-256 hex)
- `SESSION_DAYS = 180`, `createSession(ctx, hunterId): { token: string; expiresAt: Date }`, `validateSession(ctx, token): { hunter: HunterProfile; expiresAt: Date } | null` (verlängert auf 180 Tage, wenn weniger als 150 Tage übrig), `invalidateSession(ctx, token)`, `invalidateHunterSessions(ctx, hunterId)`
- `INVITE_DAYS = 7`, `createInvite(ctx, createdBy: string | null, role?: 'admin' | 'hunter'): { token; expiresAt }`, `ensureAdminInvite(ctx): string | null` (Token nur, wenn es noch keinen Hunter gibt), `redeemInvite(ctx, token, { name, password, color }): Promise<{ hunter: HunterProfile; session: { token; expiresAt } }>`
- `class LoginThrottle(clock, maxFailures = 5, lockMs = 15 min)` mit `isLocked(key)`, `recordFailure(key)`, `reset(key)`
- `login(ctx, throttle, { name, password, ip }): Promise<{ hunter; session }>`
- `AVATAR_COLORS` (8 Farben), `validateHunterName(name): string`, `type HunterProfile = { id; name; color; role; active; registeredOn }`, `getHunter(ctx, id)`, `listActiveHunters(ctx)`
- `getGoLiveDate(ctx): LocalDate`, `ensureGoLiveDate(ctx, configured?: LocalDate): LocalDate` (setzt einmalig Konfiguration oder heute)

**Testfälle:**
- Passwort unter 10 Zeichen wird abgelehnt, Hash lässt sich verifizieren.
- Einladung: einlösen legt Hunter mit Rolle der Einladung an und liefert eine Sitzung. Zweites Einlösen, abgelaufene Einladung (7 Tage + 1 ms) und unbekanntes Token scheitern. Name doppelt (Groß/Klein egal) ergibt `conflict`. Unbekannte Farbe ergibt `invalid_input`.
- `ensureAdminInvite` liefert ohne Hunter ein Admin-Token, mit Hunter `null`.
- Sitzung: gültig, nach 180 Tagen ungültig, wird bei Nutzung verlängert, ist für deaktivierte Hunter ungültig, `invalidateSession` beendet sie.
- Login: richtige Daten liefern Sitzung, falsches Passwort `unauthorized`, nach 5 Fehlversuchen `locked`, nach 15 Minuten wieder möglich, Erfolg setzt den Zähler zurück.
- Go-live-Datum wird beim ersten Aufruf gesetzt und danach nicht mehr verändert.

### Task 3: Hunter-Daten, Feed und Reaktionen

**Files:** `src/lib/server/hunters.ts` (Ausbau), `records.ts`, `feed.ts`; Tests

**Interfaces (Produces):**
- `scoringStartOf(ctx, hunter: HunterProfile): LocalDate` (späteres aus Go-live und Registrierung)
- `HunterSettings { pushEnabled; reminderEnabled; reminderTime; votePushEnabled; soundEnabled }`, `getSettings`, `updateSettings(ctx, hunterId, patch)` (Uhrzeit `HH:MM`), `updateProfile(ctx, hunterId, { name?, color? })`
- `loadHunterRecords(ctx, hunterId): HunterRecords`, `hunterTimeline(ctx, hunterId): DaySummary[]`
- `FeedEventType = 'joined' | 'activity' | 'quest_complete' | 'level_up' | 'rank_up' | 'badge' | 'missed' | 'sick' | 'missed_lifted' | 'verdict'`
- `REACTIONS = ['fire', 'muscle', 'laugh', 'eyes']`
- `appendEvent(ctx, hunterId, type, payload): string`
- `recordActivity(ctx, hunterId, { date, reps?: Partial<ExerciseTotals>, bonus?: { exercise: string; minutes: number | null; reps: number | null; effort: Effort; distanceKm: number | null; points: number } })` (ein Ereignis pro Hunter und Berliner Stunde, weitere Aktivität wird hineingerechnet)
- `FeedItem { id; type; createdAt; hunter: { id; name; color }; payload; reactions: Record<Reaction, number>; myReactions: Reaction[] }`, `listFeed(ctx, viewerId, { before?: number; limit?: number }): FeedItem[]` (neueste zuerst, Standard 30, höchstens 100)
- `toggleReaction(ctx, hunterId, eventId, reaction): { active: boolean }`

**Testfälle:**
- Wertungsbeginn ist das Go-live-Datum oder das spätere Registrierungsdatum.
- Einstellungen: Standardwerte, gültige Änderung, Uhrzeit `25:00` wird abgelehnt.
- Records liefern Sätze, Krankmeldungen und Bonus-Einträge im Domänenformat, Timeline nutzt den Wertungsbeginn.
- Aktivität in derselben Stunde landet in einem Ereignis mit summierten Wiederholungen, eine neue Stunde erzeugt ein neues Ereignis.
- Feed ist absteigend sortiert, `before` blättert, Reaktionen werden gezählt und für den Betrachter markiert, zweites Antippen nimmt die Reaktion zurück.

### Task 4: Änderungs-Pipeline, Sätze und Krankmeldungen

**Files:** `src/lib/server/pipeline.ts`, `quest.ts`; Tests

**Interfaces (Produces):**
- `applyHunterChange<T>(ctx, hunterId, mutate: () => T): T`. Ablauf: Timeline und Level vorher, `mutate` in einer Transaktion, Timeline und Level nachher, Feed `quest_complete` für jeden Tag, der neu erfüllt ist (`{ date, backfilled }`), `level_up` (`{ level }`) und `rank_up` (`{ rank }`) bei Anstieg, danach `syncMissedDays` und `syncBadges` (Task 5 und 6, bis dahin als leere Funktionen), danach `bus.publish(['board', 'feed', 'votes'])`
- `QuestSetRow { id; hunterId; date; exercise; reps; recordedAt; clientId }`
- `addSet(ctx, hunterId, { date, exercise, reps, clientId? }): QuestSetRow` (gleiche `clientId` liefert den vorhandenen Satz), `updateSet(ctx, hunterId, setId, { reps })`, `deleteSet(ctx, hunterId, setId)`, `listSets(ctx, hunterId, date)`
- `reportSick(ctx, hunterId, date): void` (idempotent, Feed `sick` mit `{ date, backfilled }`), `withdrawSick(ctx, hunterId, date): void`

**Testfälle:**
- Satz anlegen, ändern, löschen. Fremder Satz ergibt `forbidden`, unbekannter `not_found`.
- Ungültige Wiederholungen, Tag in der Zukunft, Tag vor dem 09.10.2026 oder nach dem 28.04.2027 ergeben `invalid_input`.
- Doppelte `clientId` legt keinen zweiten Satz an.
- Der Satz, der die Quest erfüllt, erzeugt `quest_complete` und `level_up` auf Level 2. Weitere Sätze am selben Tag erzeugen kein zweites `quest_complete`.
- Satz erzeugt ein Aktivitäts-Ereignis, der Bus meldet `board`, `feed` und `votes`.
- Krankmeldung erzeugt Feed `sick`, zweite Meldung für denselben Tag ist ein No-op, Rücknahme löscht sie.

### Task 5: Verpasste Tage, Strafkatalog, Abstimmungen und Strafbuch

**Files:** `src/lib/server/penalties.ts`, `votes.ts`, Anbindung in `pipeline.ts`, Deaktivierung in `hunters.ts`; Tests

**Interfaces (Produces):**
- `Penalty { id; title; description; createdBy; archived; createdAt }`, `createPenalty(ctx, hunterId, { title, description? })`, `updatePenalty(ctx, hunterId, id, patch)` und `archivePenalty(ctx, hunterId, id)` nur durch den Ersteller, `listPenalties(ctx, { includeArchived? })`
- `syncMissedDays(ctx, hunterId, timeline): void`. Nutzt `reconcileMissedDays`. Neuer Tag: `missed_days` aktiv, Abstimmung mit allen aktiven Hunters außer dem Betroffenen als Stimmberechtigte (keine Abstimmung ohne Stimmberechtigte), Feed `missed` (`{ date, voteId }`), Benachrichtigung `vote` an alle Stimmberechtigten mit aktivem Abstimmungs-Push. Aufhebung: Tag `lifted` mit Grund, offene Abstimmung `cancelled`, verhängte Strafe `lifted` mit Grund, Feed `missed_lifted` (`{ date, reason, verdictLifted }`)
- `syncHunter(ctx, hunterId): void` (Timeline laden, verpasste Tage und Badges abgleichen), `evaluateAllHunters(ctx): void` (für alle aktiven Hunter, Bus `board`, `feed`, `votes`)
- `castBallot(ctx, voterId, voteId, penaltyId): VoteView`. Nur offene Abstimmung, nur Stimmberechtigte, nur nicht archivierte Strafe. Stimme ändern ersetzt die alte. Haben alle abgestimmt: `tallyVote` mit `ctx.random`, Abstimmung `closed`, Strafbuch-Eintrag `imposed`, Feed `verdict` (`{ date, offenderId, penaltyId, penaltyTitle, decidedByLot }`), Badges von Betroffenem und Stimmberechtigten abgleichen
- `proposePenalty(ctx, voterId, voteId, { title, description? }): Penalty` (nur Stimmberechtigte einer offenen Abstimmung)
- `VoteView { id; status; date; offender; voters: { hunter; hasVoted }[]; myBallot: string | null; options: Penalty[]; counts: Record<string, number> | null (erst nach Ende); winner: Penalty | null; decidedByLot }`, `listVotes(ctx, viewerId, { status: 'open' | 'all' })`
- `VerdictView { id; hunter; date; penalty; decidedAt; decidedByLot; status; liftReason }`, `listVerdicts(ctx, { hunterId? })`
- `pendingVoteReminders(ctx): { hunterId: string; voteIds: string[] }[]` (Stimmberechtigte ohne Stimme in offenen Abstimmungen, nur mit aktivem Abstimmungs-Push)
- `removeHunterFromVotes(ctx, hunterId)`, `deactivateHunter(ctx, adminId, hunterId)` (nur Admin, nicht sich selbst; beendet Sitzungen)

**Testfälle:**
- Ein vergangener Tag ohne Pflicht nach Wertungsbeginn wird bei `evaluateAllHunters` zum aktiven verpassten Tag mit offener Abstimmung, Feed `missed` und Push an die anderen. Zweiter Lauf legt nichts doppelt an.
- Tage vor dem Wertungsbeginn und der heutige Tag erzeugen nichts.
- Bei nur einem Hunter entsteht ein verpasster Tag ohne Abstimmung.
- Nachtrag des verpassten Tags hebt Tag und offene Abstimmung auf (`missed_lifted`, Grund `backfill`). Krankmeldung hebt eine bereits verhängte Strafe auf (Grund `sick`, `verdictLifted: true`).
- Fällt ein aufgehobener Tag durch Löschen wieder unter die Pflicht, startet eine neue Abstimmung.
- Abstimmung: Betroffener darf nicht abstimmen (`forbidden`), archivierte Strafe `invalid_input`, Stimme ändern, Ende erst nach allen Stimmen, Gleichstand per Los mit `decidedByLot`, Ergebnis im Strafbuch, Zählung erst nach Ende sichtbar.
- Strafe vorschlagen erweitert den Katalog und ist wählbar.
- Strafkatalog: nur der Ersteller ändert oder archiviert.
- Deaktivierung: Abstimmungen des Deaktivierten entfallen, als Stimmberechtigter wird er entfernt und die Abstimmung kann enden.
- `pendingVoteReminders` listet nur Stimmberechtigte ohne Stimme.

### Task 6: Badges

**Files:** `src/lib/server/badges.ts`, Anbindung in `pipeline.ts` und `votes.ts`; Test

**Interfaces (Produces):**
- `syncBadges(ctx, hunterId, timeline?: DaySummary[]): BadgeId[]` (neu erreichte). Kontext aus Timeline, Bonus-Einträgen, Anzahl verhängter nicht aufgehobener Strafen, Anzahl eigener Stimmen in beendeten Abstimmungen. Neue Badges speichern mit Zeitpunkt und Feed `badge` (`{ badgeId }`), nicht mehr erfüllte löschen.
- `listHunterBadges(ctx, hunterId): { badgeId: string; earnedAt: Date }[]`

**Testfälle:**
- Erste erfüllte Quest ergibt `awakened` mit Feed-Ereignis, erneuter Abgleich erzeugt kein zweites Ereignis.
- Löschen des Satzes entzieht `awakened` wieder.
- Verhängte Strafe ergibt `penalty-zone` für den Betroffenen.

### Task 7: Bonus-Katalog und Bonus-Einträge

**Files:** `src/lib/server/bonus.ts`; Test

**Interfaces (Produces):**
- `CatalogExercise { id; name; kind: 'time' | 'reps'; secondsPerRep: number | null; tracksDistance; isRunning; createdBy: string | null; archived }`
- `listExercises(ctx, { includeArchived? })`, `createExercise(ctx, hunterId, input)`, `updateExercise(ctx, hunterId, id, patch)`, `archiveExercise(ctx, hunterId, id)`. Ändern nur durch Ersteller, Startkatalog nur durch Admin. Name 2 bis 40 Zeichen, eindeutig. Wiederholungs-Übungen brauchen Sekunden pro Wiederholung (2 bis 10).
- `BonusEntryView { id; hunterId; date; exercise: { id; name; kind }; minutes; reps; effort; distanceKm; bonusPoints; recordedAt }`
- `addBonusEntry(ctx, hunterId, { exerciseId, date, minutes?, reps?, effort, distanceKm?, clientId? })`, `updateBonusEntry(ctx, hunterId, id, patch)`, `deleteBonusEntry(ctx, hunterId, id)`, `listBonusEntries(ctx, hunterId, date)`. BP werden beim Speichern mit den Formeln aus `#lib/domain/index.ts` berechnet und gespeichert. Läuft über die Pipeline und `recordActivity`.

**Testfälle:**
- 30 Minuten Laufen moderat ergeben 150 BP, 20 Klimmzüge am Limit ergeben 12 BP.
- Zeit-Übung ohne Minuten, Wiederholungs-Übung mit Minuten, Strecke bei Übung ohne Strecke, archivierte Übung ergeben `invalid_input`.
- Änderung der Sekunden pro Wiederholung im Katalog ändert gespeicherte BP nicht.
- Fremden Eintrag ändern ergibt `forbidden`. Doppelte `clientId` legt nichts doppelt an.

### Task 8: Übersichten

**Files:** `src/lib/server/overview.ts`; Test

**Interfaces (Produces):**
- `HunterSummary { hunter; today; dayNumber; daysUntilDeparture; day: DaySummary | null; level: LevelProgress; streak: StreakInfo; bonusPoints: number; badges; openVotesForMe: number }`, `hunterSummary(ctx, hunterId)`
- `BoardRow { hunter; status: DayStatus | null; totals: ExerciseTotals; progress: number }` (Summe der auf 100 gekappten Wiederholungen, 0 bis 300), `todayBoard(ctx): BoardRow[]`
- `LeaderboardRow { hunter; level; rank; quests; bonusPoints; streak; missedDays; sickDays }`, `leaderboard(ctx, { from?, to? }): { overall; bonus; streaks }` (Sortierung: Level, dann BP; BP im Zeitraum; aktueller, dann längster Streak)
- `hunterProfile(ctx, hunterId): { summary; timeline; volume: ExerciseTotals; verdicts: VerdictView[] }`
- `dayDetail(ctx, hunterId, date): { day: DaySummary | null; sets: QuestSetRow[]; sickReportedAt: Date | null; bonus: BonusEntryView[] }`
- `stats(ctx, { hunterIds?, from, to }): { hunter; days: { date; status; totals; bonusPoints; overtimePoints }[] }[]`

**Testfälle:**
- Zusammenfassung zeigt Tag 1, 202 Tage bis Abflug, Level 2 nach erfüllter Quest und Streak 1.
- „Hunter heute“ listet alle aktiven Hunter mit Fortschritt (z. B. 100 Liegestütze und 150 Kniebeugen ergeben 200 von 300).
- Rangliste sortiert nach Level und bei Gleichstand nach BP, Bonuswertung filtert nach Zeitraum.
- Statistik liefert pro Hunter die Tage im Zeitraum.

### Task 9: Gesamtprüfung

- [ ] `npm test`, `npm run check`, `npm run build` grün
- [ ] Commit und Push auf `main` über einen Feature-Branch mit Merge
