# Plan 4 · Oberfläche · Implementation Plan

> **Umsetzung:** Task für Task. Reine Client-Logik (Statistik-Aggregation, Feed-Texte, Datums-Labels, Offline-Warteschlange, Push-Schlüssel) wird testgetrieben mit Vitest gebaut. Seiten und Komponenten werden nach jedem Task im Browser-Fenster auf Handy- (390 px) und Desktop-Breite (1280 px) geprüft.

**Goal:** Die komplette Oberfläche der Spezifikation (Abschnitt 5 und 6) im Shadow-Monarch-Stil, mobil und Desktop, als installierbare PWA mit Push und Offline-Einträgen.

**Architecture:** SvelteKit-Seiten mit Server-`load`, die die Dienste aus Plan 2 direkt aufrufen (schneller erster Aufbau). Änderungen laufen per `fetch` über die JSON-API aus Plan 3, danach `invalidate('app:data')`. Ein `EventSource` auf `/api/events` löst bei Änderungen anderer Hunter ebenfalls `invalidate` aus. System-Meldungen entstehen im Client aus dem Vergleich alter und neuer Daten. Offline-Einträge landen mit `clientId` in IndexedDB und werden beim nächsten Netz gesendet.

**Tech Stack:** Svelte 5 (Runes), SvelteKit 3, @fontsource Oxanium und Barlow, @lucide/svelte, ECharts 6, idb-keyval, sharp (nur zum Erzeugen der Icons).

## Global Constraints

- Alle Constraints aus Plan 1 bis 3 gelten weiter.
- Oberfläche Deutsch, System-Meldungen Englisch (`DAILY QUEST`, `QUEST COMPLETE`, `LEVEL UP!`, `RANK UP`, `NEW BADGE`, `WARNING`).
- Look „Shadow Monarch“ (Stilprobe B): Hintergrund fast schwarz mit violettem Schimmer, Panels mit Eckklammern, Akzent Violett `#a47cff`, erfüllt Türkis `#7ef0d0`, verpasst Rot `#ff4f7b`, krank Grau. Schriften Oxanium (System, Zahlen) und Barlow (Text), selbst gehostet.
- Mobile first ab 360 px ohne horizontales Scrollen, Navigation unten. Ab 1024 px Seitenleiste links und mehrspaltige Inhalte.
- Bedienbar mit Tastatur, sichtbarer Fokus, `prefers-reduced-motion` schaltet Animationen ab. Keine Browser-Dialoge (`alert`, `confirm`), Bestätigungen in der Seite.
- Keine Grafiken, Namen oder Logos aus Solo Leveling.

## Seiten

| Pfad | Inhalt |
|---|---|
| `/login`, `/register?token=` | Anmelden, Registrieren über Einladung |
| `/` | Quest: Countdown, Hunter-Karte, Daily Quest mit Schnelltasten und Satzliste, Krankmeldung, Bonus, Hunter heute; `?date=` zum Nachtragen |
| `/statistik` | Filter (Zeitraum, Personen, Übung, Ansicht), Kennzahlen, Diagramme, Kalender |
| `/rangliste` | Gesamt, Bonus (mit Zeitraum), Streak |
| `/hunter/[id]` | Statusfenster: Rang, Level, Werte, Badges, Kalender, Strafbuch |
| `/feed` | Feed mit Reaktionen und Nachladen |
| `/strafen` | Offene Abstimmungen, Strafkatalog, Strafbuch |
| `/profil` | Profil, Benachrichtigungen, Installationsanleitung, Abmelden, Admin |

## Tasks

1. **Design-Grundlage und Rahmen:** Schriften, Tokens (`src/lib/ui/theme.css`), Basis-Komponenten (Panel, Button, ProgressBar, RankBadge, Avatar, StatusChip, Sheet, Segmented), App-Rahmen mit Navigation und Sitzungsprüfung (`(app)/+layout.server.ts`), Login und Registrierung, Client-Helfer `api.ts` (Fehler als deutsche Meldung).
2. **Quest-Seite:** Countdown, Hunter-Karte, Daily Quest (Schnelltasten, eigene Zahl, Satzliste mit Ändern und Löschen, Timer bis Mitternacht), Krankmeldung mit Bestätigung, Tageswechsel zum Nachtragen, Bonus-Formular mit BP-Vorschau und Übung anlegen, Hunter heute, Live-Updates.
3. **System-Meldungen:** Warteschlange, Overlay mit Animation, Auslöser QUEST COMPLETE, LEVEL UP, RANK UP, NEW BADGE, WARNING (neue verpasste Tage anderer seit dem letzten Besuch), optionaler Ton per WebAudio.
4. **Feed und Strafen:** Feed-Texte je Ereignistyp (getestet), relative Zeit, Reaktionen, Nachladen; Abstimmungen mit Stimmabgabe und Vorschlag, Strafkatalog mit Anlegen, Ändern, Archivieren; Strafbuch.
5. **Rangliste und Statusfenster:** drei Wertungen, Badge-Raster (erreicht und gesperrt), Kalender über 202 Tage, Strafbuch-Auszug.
6. **Statistik:** Aggregation pro Tag, Woche und kumuliert (getestet), Kennzahlen, ECharts-Diagramme mit Zoom.
7. **Profil, Push und Admin:** Name und Farbe, Einstellungen, Push-Abo mit VAPID-Schlüssel (Umwandlung getestet), Installationsanleitung iPhone und Android, Abmelden, Einladungslink mit Kopieren, Hunter deaktivieren, Backup-Download.
8. **PWA und Offline:** Manifest, Icons per Skript, Service Worker (App-Cache, Push-Anzeige, Klick öffnet Ziel), Offline-Warteschlange (getestet) mit Anzeige ausstehender Einträge.
9. **Abnahme im Browser:** Durchgang aller Seiten auf 390 px und 1280 px, Konsole ohne Fehler, `npm test`, `npm run check`, `npm run build` grün, Merge und Push.
