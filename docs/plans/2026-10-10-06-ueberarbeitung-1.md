# Plan 6 · Überarbeitung 1 · Implementation Plan

> **Umsetzung:** Task für Task, Domäne und Dienste testgetrieben mit Vitest. Seiten nach jedem UI-Task per Screenshot-Skript auf 390 px und 1280 px prüfen, in beiden Farbschemata.

**Goal:** Die Überarbeitung aus `docs/specs/2026-10-10-ueberarbeitung-1-design.md` umsetzen: neuer Start mit Aufwärmtagen, angepasste Levelkurve, eigener Trainingsplan pro Spieler mit Import, Spielername, Profilbild, Farbschemata, Erfolge-Seite, flackerndes Warnfenster, XP bis zum nächsten Level.

**Architecture:** Das Domänenmodul bekommt Pläne (`PlanItem`, Planversionen mit `validFrom`) und wertet Tage gegen den am Tag gültigen Plan aus. Sätze speichern Übungs-ID und Wert statt fester Übung. Der Import-Parser ist reine Logik in `src/lib/domain/plan-import.ts` und läuft im Browser. Badges werden zu Definitionen mit Fortschrittsmessung. Farbschemata laufen über CSS-Variablen und `data-theme` am `<html>`, das der Server beim Rendern setzt.

**Tech Stack:** wie bisher. sharp wird zusätzlich zur Laufzeit für Profilbilder genutzt (wandert in `dependencies`).

## Global Constraints

- Alle Constraints aus Plan 1 bis 4 gelten weiter.
- Im Repo nichts mit Bezug zum Arbeitgeber oder zu Firmenwerkzeugen.
- Bestehende Testdaten dürfen verworfen werden, es gibt noch keine echten Daten.
- Badge-Icons aus `@lucide/svelte`, jedes Badge ein eigenes Icon.
- Keine Originalgrafiken oder Namen aus der Vorlage. Die acht Avatare sind eigene KI-Bilder von Tobias.

## Tasks

1. **Kalender und Level (Domäne):** `WARMUP_START` 09.10., `CHALLENGE_START` 12.10., `CHALLENGE_DAYS` 199, Status `warmup`, `dayNumber` null an Aufwärmtagen, `S_RANK_QUESTS` 192, XP bis zur nächsten Schwelle (`xpToNextLevel`). Tests anpassen und ergänzen.
2. **Trainingsplan (Domäne):** `PlanItem`, `PlanVersion`, `planFor(date)`, Tagesauswertung gegen den Plan, `completionTime`, Mehrleistung als BP, Tagesfortschritt 0 bis 1, Volumen nach Einheit und Übung. Validierung von Planpunkten und Satzwerten. Tests.
3. **Import-Parser (Domäne):** `parsePlanText` für Prompt-Format, JSON, CSV und freie Zeilen, Einheiten-Erkennung, `matchExercise` mit Synonymen, Prompt-Text `PLAN_IMPORT_PROMPT`. Tests mit typischen KI-Antworten.
4. **Badges (Domäne):** 28 Definitionen mit Gruppe, Beschreibung, Icon-Schlüssel und Fortschritt. `earnedBadges` und `badgeProgress`. Tests.
5. **Datenbank:** Schema und Migrationen per drizzle-kit (Sätze neu, `plans`, `plan_items`, Hunter-Spalten), Kernübungen mit festen IDs im Seed, Startplan bei Registrierung.
6. **Dienste:** `plans.ts` (lesen, speichern mit Versionsregel, neue Übungen im selben Schritt, Feed `plan_changed`), `quest.ts` (Sätze je Übung und Einheit), `records.ts`, `overview.ts`, `feed.ts`, `badges.ts`, `votes.ts` angepasst. Tests.
7. **Profil-Dienste:** Spielername (setzen, löschen, eindeutig), Avatar (Vorlage, Upload mit sharp, löschen), Farbschema. `HunterRef` mit Anzeigename und Bild-URL überall. Tests.
8. **API:** `/api/plan` (GET, PUT), `/api/hunters/[id]/plan`, `/api/me` (Spielername, Farbschema), `/api/me/avatar` (PUT Vorlage, POST Upload, DELETE), `/api/avatars/[file]`, `/api/badges`, `/api/sets` mit Übungs-ID. `docs/api.md`.
9. **Farbschemata und Rahmen:** Farbwerte als Variablen, Palette „Gate“, `data-theme` per `transformPageChunk`, `theme-color`, Logo in Kopfzeile und Login, Avatar mit Bild, sechster Menüpunkt „Erfolge“.
10. **Quest-Seite:** Planpunkte als Zeilen mit passenden Schnelltasten, Satzliste mit Übungsnamen, Aufwärmtage, Hunter heute mit Prozent, „noch X XP bis Lv. Y“, Link zum Trainingsplan.
11. **Trainingsplan-Seite:** Editor, Import mit Prompt kopieren, Einfügen, Datei, Vorschau mit Zuordnung, Speichern mit Hinweis ab wann.
12. **Profil-Seite:** Spielername, Avatar-Auswahl und Upload, Farbschema.
13. **Erfolge-Seite:** Stand je Spieler, Badge-Karten mit Icon, Fortschritt, Inhabern, Details.
14. **Statistik und Statusfenster:** neue Kennzahlen und Diagramme, Plan im Statusfenster, Diagrammfarben je Farbschema geprüft.
15. **Warnfenster:** elektrisches Flackern, ruhig bei reduzierter Bewegung.
16. **Abschluss:** Skripte `seed-dev.mjs` und `dev-vote.mjs`, README, Übergabe, Roadmap, `npm test`, `svelte-check`, Build, Screenshots beider Farbschemata, Commit und Push.
