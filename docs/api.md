# Level Up · Kalabrien · API

Alle Endpunkte liegen unter `/api`, sprechen JSON und nutzen das HttpOnly-Cookie `session`. Ohne gültige Sitzung antworten alle Endpunkte außer `/api/auth/*` und `/api/push/key` mit 401.

**Fehler** haben immer die Form `{ "error": { "code": "...", "message": "..." } }`.

| Code | Status | Bedeutung |
|---|---|---|
| `invalid_input` | 400 | Eingabe ungültig, Meldung sagt was |
| `unauthorized` | 401 | Nicht angemeldet oder Login falsch |
| `forbidden` | 403 | Fremder Eintrag oder Admin-Recht fehlt |
| `not_found` | 404 | Gibt es nicht |
| `conflict` | 409 | Name vergeben, Abstimmung schon beendet |
| `locked` | 429 | Login nach 5 Fehlversuchen 15 Minuten gesperrt |
| `internal` | 500 | Unerwarteter Fehler |

Kalendertage sind Text `JJJJ-MM-TT`, Zeitpunkte ISO-Strings.

## Login

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/auth/invite?token=` | | `{ valid, role }` |
| `POST /api/auth/register` | `{ token, name, password, color }` | `{ hunter }`, setzt Cookie |
| `POST /api/auth/login` | `{ name, password }` | `{ hunter }`, setzt Cookie |
| `POST /api/auth/logout` | | `{ ok }`, löscht Cookie |

Farben: `#a47cff`, `#7ef0d0`, `#ff7a45`, `#4cc9ff`, `#ff4f7b`, `#f5c542`, `#62f0a6`, `#c9b2ff`. Passwort mindestens 10 Zeichen, Name 2 bis 20 Zeichen.

## Ich

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/me` | | `{ summary: HunterSummary, settings }` |
| `PATCH /api/me` | `{ displayName? (null oder leer löscht), color?, theme? ("monarch"/"gate") }` | `{ hunter }` |
| `PUT /api/me/avatar` | `{ preset ("01" bis "08") }` | `{ hunter }` |
| `POST /api/me/avatar` | Bilddatei als Körper, `content-type: image/*`, höchstens 6 MB | `{ hunter }` (Bild als 256-px-WebP gespeichert) |
| `DELETE /api/me/avatar` | | `{ hunter }` |
| `GET /api/avatars/:file` | | Profilbild als WebP (nur angemeldet) |
| `GET /api/plan` | | `{ plan: { today, current, upcoming, nextStart }, progression: { weekStart, rating, nextMonday, preview, fulfilledThisWeek, neededPerWeek, checkinDue, capped }, rotation: { decision, trained, focus, swaps, effectiveFrom } }` |
| `PUT /api/plan/rating` | `{ rating ("too_easy"/"right"/"too_hard") }` | `{ progression }`, gilt für die laufende Woche, nur selbst sichtbar |
| `POST /api/plan/prompt` | `{ notes?, focus? }` | `{ prompt }` für die eigene KI, mit `focus` für neue Muskelgruppen |
| `POST /api/plan/rotation` | `{ accept: [Index der Vorschläge] }`, leer = ablehnen | `{ rotation }` |
| `PUT /api/plan` | `{ items: [{ exerciseId? oder newExercise?, unit ("reps"/"minutes"/"km"), target }] }` | `{ plan }`, gilt ab `nextStart` |
| `GET /api/badges` | | `{ badges, hunters: [{ hunter, earned }], progress }` |
| `GET /api/me/settings` | | `{ settings }` |
| `PATCH /api/me/settings` | `{ pushEnabled?, reminderEnabled?, reminderTime? ("HH:MM"), votePushEnabled?, soundEnabled? }` | `{ settings }` |

`HunterSummary`: `hunter`, `today`, `dayNumber`, `daysUntilDeparture`, `day` (Tagesübersicht von heute), `level` (`level`, `rank`, `xp`, `levelStartXp`, `nextLevelXp`, `progress` 0 bis 1), `streak` (`current`, `longest`), `bonusPoints`, `badges` (`badgeId`, `earnedAt`), `openVotesForMe`.

## Daily Quest

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/board` | | `{ board: [{ hunter, status, progress (0 bis 1) }] }` |
| `GET /api/days/:date` | | `{ day, sets, sickReportedAt, bonus }` (eigene Daten) |
| `POST /api/sets` | `{ date, exerciseId, value, clientId? }`, Übung muss am Tag im Plan stehen, Wert in dessen Einheit | `{ set }` |
| `PATCH /api/sets/:id` | `{ value }` | `{ set }` |
| `DELETE /api/sets/:id` | | `{ ok }` |
| `PUT /api/sick/:date` | | `{ ok }` |
| `DELETE /api/sick/:date` | | `{ ok }` |

`clientId` macht das Anlegen idempotent (Offline-Warteschlange).

## Bonus

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/exercises?archived=1` | | `{ exercises }` |
| `POST /api/exercises` | `{ name, kind ("time"/"reps"), secondsPerRep?, tracksDistance?, isRunning? }` | `{ exercise }` |
| `PATCH /api/exercises/:id` | `{ name?, secondsPerRep?, tracksDistance?, isRunning? }` | `{ exercise }` |
| `DELETE /api/exercises/:id` | | `{ exercise }` (archiviert) |
| `POST /api/bonus` | `{ exerciseId, date, minutes? oder reps?, effort ("easy"/"moderate"/"hard"/"max"), distanceKm?, clientId? }` | `{ entry }` |
| `PATCH /api/bonus/:id` | `{ minutes?, reps?, effort?, distanceKm? }` | `{ entry }` |
| `DELETE /api/bonus/:id` | | `{ ok }` |

## Strafen und Abstimmungen

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/penalties?archived=1` | | `{ penalties }` |
| `POST /api/penalties` | `{ title, description? }` | `{ penalty }` |
| `PATCH /api/penalties/:id` | `{ title?, description? }` | `{ penalty }` |
| `DELETE /api/penalties/:id` | | `{ penalty }` (archiviert) |
| `GET /api/votes?status=open\|all` | | `{ votes: VoteView[] }` |
| `POST /api/votes/:id/ballot` | `{ penaltyId }` | `{ vote }` |
| `POST /api/votes/:id/proposals` | `{ title, description? }` | `{ penalty }` |
| `GET /api/verdicts?hunter=` | | `{ verdicts }` |

`VoteView`: `id`, `status` (`open`/`closed`/`cancelled`), `date`, `offender`, `voters` (`hunter`, `hasVoted`), `myBallot`, `options`, `counts` (erst nach Ende), `winner`, `decidedByLot`.

## Feed, Rangliste, Statistik

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/feed?before=<ms>&limit=` | | `{ items }` (neueste zuerst) |
| `POST /api/feed/:id/reactions` | `{ reaction ("fire"/"muscle"/"laugh"/"eyes") }` | `{ active }` |
| `GET /api/leaderboard?from=&to=` | | `{ overall, bonus, streaks }` |
| `GET /api/hunters` | | `{ hunters }` |
| `GET /api/hunters/:id` | | `{ summary, timeline, volume, plan: { current, upcoming }, verdicts }` |
| `GET /api/stats?from=&to=&hunters=a,b` | | `{ series: [{ hunter, days, exercises }] }`, Tage mit `progress`, `reps`, `minutes`, `km`, `byExercise` |

Feed-Typen: `joined`, `activity`, `quest_complete`, `level_up`, `rank_up`, `badge`, `missed`, `sick`, `missed_lifted`, `verdict`.

## Live und Push

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `GET /api/events` | | SSE: `event: ready`, dann `event: change` mit `data: ["board","feed","votes",...]` |
| `GET /api/push/key` | | `{ publicKey }` (VAPID) |
| `POST /api/push/subscription` | `{ endpoint, keys: { p256dh, auth } }` | `{ ok }` |
| `DELETE /api/push/subscription` | `{ endpoint }` | `{ ok }` |

Push-Nachrichten haben die Form `{ title, body, url, tag }`.

## Admin

| Methode und Pfad | Eingabe | Antwort |
|---|---|---|
| `POST /api/admin/invites` | `{ role? }` | `{ link, expiresAt }` |
| `POST /api/admin/hunters/:id/deactivate` | | `{ ok }` |
| `GET /api/admin/backup` | | SQLite-Datei als Download |
