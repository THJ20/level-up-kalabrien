# Level Up · Kalabrien · Überarbeitung 1

Stand 10.10.2026, abgestimmt mit Tobias. Dieses Dokument ergänzt die Spezifikation `2026-10-09-level-up-kalabrien-design.md`. Wo sich beide widersprechen, gilt dieses Dokument.

## 1. Kalender

- **Aufwärmtage** sind Fr 09.10. bis So 11.10.2026. Man kann sie eintragen, sie erscheinen in Statistik, Kalender und Feed. Sie geben kein XP, keinen Streak, keine Strafe und zählen für keine Badges außer den Volumen-Badges. Tagesstatus `warmup`.
- **Offizieller Start** ist Mo 12.10.2026 (Tag 1). Letzter Tag ist Mi 28.04.2027 (Tag 199). Abflug bleibt Do 29.04.2027.
- **Bis zum Go-live** gilt die bestehende Regel weiter. Wertungsbeginn ist das spätere Datum aus Go-live und Registrierung. Tage davor zählen voll, wenn sie erfüllt nachgetragen werden. Leere Tage davor sind `unscored`, lösen keine Abstimmung aus und pausieren den Streak.
- Erinnerungen und Abstimmungen gibt es an Aufwärmtagen nicht.

## 2. Level und Rang

- XP weiter nur aus erfüllten Daily Quests, 100 XP pro Tag. Bonuspunkte zählen nicht.
- Kurve `q(L) = 192 × ((L − 1) / 49)^1,6`. S-Rang (Level 50) nach 192 Quests, Level 51 nur mit allen 199 Tagen. Puffer 7 Tage wie bisher. Bei durchgehender Erfüllung kommt der S-Rang am 21.04.2027.
- Ränge unverändert: E 1 bis 9, D 10 bis 19, C 20 bis 29, B 30 bis 39, A 40 bis 49, S ab 50.
- Startübersicht und Statusfenster zeigen „noch X XP bis Lv. Y“. X ist die Differenz bis zur nächsten vollen Quest-Schwelle.

## 3. Trainingsplan

### Regeln
- Jeder Spieler hat **seinen eigenen Plan**. Er gilt **jeden Tag gleich**.
- Ein Planpunkt ist eine Übung aus dem gemeinsamen Katalog mit einem Ziel in einer Einheit.
  - Wiederholungs-Übungen haben die Einheit Wiederholungen (1 bis 1000).
  - Zeit-Übungen haben Minuten (1 bis 600) oder, wenn sie eine Strecke erfassen, wahlweise Kilometer (0,1 bis 100).
- Ein Plan hat 3 bis 5 Übungen, jede höchstens einmal (Nachtrag 11.10.2026). Schwerer wird er über die Ziele und schwerere Varianten, nicht über mehr Übungen.
- Der Katalog bekommt die Kernübungen **Liegestütze, Kniebeugen und Sit-ups/Crunches** (Wiederholungen, je 3 Sekunden). Sie haben feste IDs `pushups`, `squats`, `situps`.
- **Startplan** für jeden neuen Spieler ist 100 Liegestütze, 100 Kniebeugen, 100 Sit-ups/Crunches, gültig ab dem ersten Aufwärmtag.
- **Änderungen gelten ab dem nächsten Tag.** Die heutige Quest ändert sich nie mitten am Tag. Vergangene Tage werden immer am damals gültigen Plan gemessen.
  - Ausnahme: Solange ein Spieler noch keinen einzigen Satz eingetragen hat, ersetzt sein gespeicherter Plan den Startplan rückwirkend ab Beginn. So kann jemand, der erst nach dem Start dazukommt, seine Lücken mit dem eigenen Plan nachtragen.
  - Mehrere Änderungen am selben Tag überschreiben den Plan für morgen.
- Ein **Tag ist erfüllt**, wenn jeder Planpunkt des Tages sein Ziel erreicht.
- **Alle sehen die Pläne der anderen** im Statusfenster. Eine Änderung erscheint im Feed („… hat den Trainingsplan geändert, gilt ab …“).

### Erfassen
- Die Quest-Seite zeigt die Planpunkte des Tages wie bisher als Zeilen mit Fortschritt und Schnelltasten. Die Schnelltasten richten sich nach Einheit und Ziel.
- Erfasst wird in Einzelsätzen pro Übung, Wert in der Einheit des Planpunkts.
- Sätze lassen sich ändern und löschen wie bisher, auch offline.

### Mehrleistung
- Was über das Ziel eines Planpunkts hinausgeht, gibt Bonuspunkte.
  - Wiederholungen: `Wdh. × Sekunden pro Wdh. der Übung × 7 ÷ 60` (Stufe hart).
  - Minuten: `Minuten × 7`.
  - Kilometer geben keine automatischen Bonuspunkte. Dafür gibt es die Zusatzübung.

### Plan anlegen und ändern
- Eigene Seite **Trainingsplan** (`/plan`), erreichbar von der Quest-Seite, dem Profil und dem eigenen Statusfenster.
- **Von Hand:** Übung aus dem Katalog wählen oder neu anlegen (gleiches Formular wie bei den Zusatzübungen), Ziel und Einheit festlegen, Reihenfolge ändern, entfernen.
- **Import:**
  1. „Prompt kopieren“ legt einen fertigen Prompt in die Zwischenablage.
  2. Der Spieler gibt ihn seiner eigenen KI, zusammen mit Datei, Foto oder Text des Plans.
  3. Die Antwort fügt er ein oder lädt sie als Textdatei hoch (`.txt`, `.md`, `.csv`, `.json`).
  4. Die App erkennt die Zeilen und zeigt eine Vorschau. Bekannte Übungen werden zugeordnet, unbekannte als neue Katalogübung vorgeschlagen. Alles ist vor dem Speichern änderbar.
- Die Erkennung läuft komplett im Browser, ohne KI. Sie versteht das Format aus dem Prompt (`Übung | Ziel | Einheit`), JSON, CSV und einfache Zeilen wie „3x20 Kniebeugen“, „100 Liegestütze“, „Plank 3 Min“, „5 km Laufen“.

## 4. Statistik und Badges

- **Statistik:** Kennzahlen Wiederholungen, Minuten, Kilometer, Ø Planerfüllung, bester Tag, Bonuspunkte, erfüllt, krank, verpasst.
  - Kennzahlen im Diagramm sind Planerfüllung in Prozent (vergleichbar zwischen Spielern mit verschiedenen Plänen), Wiederholungen, Minuten und Bonuspunkte.
  - Für eine Person zeigt „Wiederholungen“ gestapelt die vier häufigsten Übungen, der Rest als „Andere“.
- **Badges** (28):
  - Durchhalten (6): Erwacht, Double Dungeon überlebt, Unermüdlich, Unaufhaltsam, Arise, Shadow Monarch (alle 199 Tage).
  - Rang (5): D, C, B, A, S.
  - Volumen (8): Wiederholungen I bis IV (5.000, 15.000, 30.000, 50.000), Ausdauer I und II (500 und 2.000 Minuten), Strecke I und II (50 und 200 km). Gezählt werden Daily Quest und Zusatzübungen.
  - Bonus (4): Overtime (Planziel erstmals übertroffen), Extra-Meile, Gate-Brecher, Monatsmarathon.
  - Spaß (5): Frühaufsteher, Last Minute, Penalty Zone, Richter, Architekt (eigenen Trainingsplan gespeichert).
- Jeder Badge hat ein eigenes Icon, eine Beschreibung, wie man ihn bekommt, und wo messbar einen Fortschritt.

## 5. Erfolge

- Neuer Menüpunkt **Erfolge** (`/erfolge`).
- Oben der Stand jedes Spielers (erreichte Badges von allen).
- Darunter alle Badges nach Gruppen. Erreichte farbig mit Icon und Datum, offene grau mit Schloss und Fortschritt („12 von 30 Tagen“).
- An jedem Badge sieht man, welche Spieler ihn haben. Ein Tipp öffnet die Details mit allen Spielern und Datum.

## 6. Profil

- **Login-Name** bleibt fest (bei der Registrierung gewählt).
- **Spielername** ist optional, 2 bis 20 Zeichen, in der Gruppe eindeutig (auch gegenüber Login-Namen anderer). Überall in der App erscheint der Spielername, ohne ihn der Login-Name. Speichern, ändern und löschen im Profil.
- **Profilbild:**
  - Eines der acht vorgefertigten Avatare wählen (`static/avatars`).
  - Oder ein eigenes Foto hochladen. Der Browser verkleinert es vorher auf höchstens 1024 px, der Server schneidet es quadratisch zu und speichert es als WebP mit 256 px im Datenordner (`avatars/`).
  - Bild ändern oder löschen. Ohne Bild erscheinen die Initialen in der Spielerfarbe.
- **Farbschema** pro Spieler, gespeichert auf dem Server:
  - „Shadow Monarch“, dunkel und violett (Standard).
  - „Gate“, schwarz und orange.
- Die ganze App zeigt immer die Daten und Einstellungen des eingeloggten Spielers. Nichts ist auf eine bestimmte Person festgelegt.

## 7. Warnfenster

- Die WARNING-Meldung für verpasste Tage flackert beim Erscheinen wie eine elektrische Störung (Rahmen und Titel flackern, Lichtblitze, Störstreifen) und zuckt danach in unregelmäßigen Abständen kurz nach.
- Mit „Bewegung reduzieren“ am Gerät bleibt sie ruhig.

## 8. Logo und Icons

- App-Icons kommen aus dem Logo von Tobias (`assets/logo`, `scripts/cut-logo.mjs`, `scripts/generate-icons.mjs`).
- Das Logo erscheint auch in der App (Kopfzeile, Login) passend zum Farbschema.
- Vor dem Go-live auf echten Geräten prüfen, dass das Icon in Benachrichtigungen erscheint.

## 9. Daten

- Die bisherigen Testdaten werden verworfen. Die Migration legt die Tabelle für Sätze neu an.
- Neue Tabellen `plans` (Version mit `valid_from`) und `plan_items`.
- Neue Spalten an `hunters`: `display_name`, `display_name_key`, `avatar`, `theme`.

## 10. Steigerung, Check-in und Plan-Coach (Nachtrag 11.10.2026)

- **Wöchentliche Steigerung:** Jeden Montag um Mitternacht bekommt jeder Hunter automatisch eine neue Planversion.
  - Bewertung der Vorwoche: zu leicht +10 %, passend +5 %, zu schwer −10 %. Ohne Bewertung gilt passend.
  - Wer in der Vorwoche weniger als 5 von 7 Tagen erfüllt hat, bleibt gleich. „Zu schwer“ senkt trotzdem.
  - Ab etwa 30 Minuten geschätzter Dauer pausiert die Steigerung. Die Schätzung bleibt intern (Wiederholungen mal Sekunden der Übung, Minuten, Kilometer mal 6 Minuten). Die App rät dann zum Prompt für schwerere Varianten.
  - Der Faktor wirkt auf die Ziele des letzten selbst gespeicherten Plans, damit auch kleine Ziele wachsen. Ein selbst gespeicherter Plan setzt den Faktor auf 1 zurück. Hat jemand für Montag schon selbst einen Plan gespeichert, entfällt die Steigerung.
  - Erste Steigerung am Mo 19.10.2026, letzte am Mo 26.04.2027. Untergrenze ist die Hälfte des Ausgangsplans.
  - Am Montag zeigt die App „QUEST UPGRADED“ oder „QUEST ADJUSTED“ mit Prozent. Im Feed erscheint nichts.
- **Bewertung:** Nur der Hunter selbst sieht sie. Sonntags erscheint auf der Quest-Seite ein Check-in, bis bewertet ist. Auf der Plan-Seite geht es jederzeit, mit Vorschau auf den nächsten Montag.
- **Plan-Coach:** Auf der Plan-Seite erzeugt die App jederzeit einen Prompt mit aktuellem Plan, Bewertung, Verlauf der letzten 14 Tage und eigenen Hinweisen. Vorgaben im Prompt sind 3 bis 5 Übungen (möglichst so viele wie bisher), 15 bis 30 Minuten pro Tag, ohne Geräte, nebenbei machbar, progressiv über mehr Wiederholungen, längere Zeiten oder schwerere Varianten und ab 30 Minuten nur noch schwerere Varianten. Kopieren oder per Teilen-Menü direkt an die KI-App schicken, Antwort wie beim Import einfügen.
- **Installation:** Der Browser bietet die Installation nur einmal beim Laden an. Die App fängt das global ab. Auf der Quest-Seite erscheint am Handy ein ausblendbarer Hinweis mit Button (Android) oder Anleitung (iPhone). Das Manifest hat App-ID, Screenshots für den Installationsdialog und Kurzbefehle (Quest, Trainingsplan, Erfolge). Installation, Push, Teilen und Kopieren gehen nur über HTTPS.

## 11. Feed und neue Muskelgruppen (Nachtrag 11.10.2026)

- **Feed:** Einzelne Sätze der Daily Quest erscheinen nicht mehr. Es bleiben Ergebnisse (Daily Quest erfüllt oder nachgetragen, Level, Rang, Badges, Planänderungen, Strafen) und Zusatzübungen.
- **Neue Muskelgruppen:** Der Sonntags-Check-in hat zwei Schritte. Erst die Bewertung, dann die Frage, ob neue Muskelgruppen in den Plan sollen.
  - Die App kennt rund 30 Übungen ohne Geräte mit ihren Muskelgruppen (Brust und Trizeps, Rücken, Schultern, Rumpf, Oberschenkel, Po und Beinrückseite, Ausdauer).
  - Sie schaut auf den aktuellen Plan und die letzten vier Planversionen. Neu vorgeschlagen werden die Gruppen, die im Plan fehlen, zuletzt trainierte später. Übungen aus früheren Plänen werden nicht noch einmal vorgeschlagen.
  - Pro Woche 1 bis 2 Tausche. Getauscht wird zuerst die Übung, deren Muskelgruppen im Plan doppelt vorkommen. Jeden Tausch kann man einzeln an- oder abwählen.
  - „Nein, Plan behalten“ lehnt für diese Woche ab. Übernommene Tausche gelten ab dem nächsten Tag (sonntags ab Montag). Die übrigen Übungen steigen dann trotzdem wie bei der automatischen Steigerung.
  - Auf der Plan-Seite geht das jederzeit. Im KI-Prompt gibt es die Option „Fokus auf neue Muskelgruppen“.
  - Die Entscheidung sieht nur der Hunter selbst.
