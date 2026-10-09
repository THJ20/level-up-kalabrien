# Domänenmodul

Alle Spielregeln von Level Up · Kalabrien als reine Funktionen. Keine Datenbank, kein SvelteKit, keine aktuelle Uhrzeit: „heute“ und „jetzt“ werden immer übergeben. Importiert wird ausschließlich über `#lib/domain/index.ts`.

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
