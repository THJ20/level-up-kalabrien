# Level Up · Kalabrien · Design-Spezifikation

Stand: 09.10.2026 · Autor: Tobias Heinze (mit Claude) · Status: zur Freigabe

## 1. Ziel und Rahmen

Eine Web-App (PWA), mit der eine kleine Gruppe von 2 bis 5 Personen bis zur gemeinsamen Reise nach Kalabrien jeden Tag ihre Sport-Challenge erfasst, sich gegenseitig sieht und motiviert. Look und Spielmechanik sind angelehnt an das „System“ aus dem Anime Solo Leveling, ohne dessen Namen, Logos, Figuren oder Grafiken zu übernehmen.

- **Challenge-Zeitraum:** Tag 1 = Fr, 09.10.2026, Tag 202 = Mi, 28.04.2027.
- **Countdown-Ziel:** Abflug Do, 29.04.2027 (Reise nach Kalabrien, 29.04. bis 02.05.2027).
- **Zeitzone:** Europe/Berlin für alle Teilnehmer und alle Berechnungen.
- **Plattform:** Eine PWA für iPhone, Android und Desktop, installierbar auf dem Homescreen.
- **Betrieb:** Auf dem Server von Niklas, ein Docker-Container.
- **Sprache:** Oberfläche Deutsch. System-Meldungen im Anime-Stil Englisch („DAILY QUEST“, „LEVEL UP!“, „WARNING“, „QUEST COMPLETE“).
- **Go-live:** Erst wenn alle Funktionen dieser Spezifikation fertig und getestet sind (keine Etappen).

## 2. Glossar

| Begriff | Bedeutung |
|---|---|
| Hunter | Teilnehmer der Challenge (ein Benutzerkonto). |
| Admin | Hunter mit Zusatzrechten (Tobias). |
| Challenge-Tag | Kalendertag in Europe/Berlin zwischen 09.10.2026 und 28.04.2027, nummeriert 1 bis 202. |
| Daily Quest | Pflichtpensum eines Challenge-Tags: je 100 Liegestütze, Kniebeugen und Sit-ups/Crunches. |
| Pflichtübung | Eine der drei Übungen der Daily Quest. Sit-ups und Crunches sind dieselbe Pflichtübung. |
| Satz | Ein Eintrag mit einer Anzahl Wiederholungen für eine Pflichtübung an einem Challenge-Tag. |
| Tagesstatus | Zustand eines Challenge-Tags pro Hunter, siehe Abschnitt 3.2. |
| Go-live-Datum | Kalendertag, an dem die App produktiv startet. Tage davor werden nie als verpasst gewertet. |
| Wertungsbeginn | Pro Hunter das spätere Datum aus Go-live-Datum und Registrierungsdatum. |
| Nachtrag | Eintrag (Satz, Bonusaktivität, Krankmeldung) für einen bereits vergangenen Challenge-Tag. |
| XP | Erfahrungspunkte für das Level, nur aus erfüllten Daily Quests. |
| Rang | Hunter-Rang E, D, C, B, A, S, abgeleitet aus dem Level. |
| BP | Bonuspunkte aus Zusatzsport, eigene Wertung unabhängig vom Level. |
| Stufe | Selbst eingeschätzte Anstrengung einer Bonusaktivität: locker, moderat, hart, am Limit. |
| Streak | Anzahl erfüllter Challenge-Tage am Stück. |
| Strafkatalog | Von den Hunters angelegte Liste möglicher Strafen. |
| Abstimmung | Entscheidung über die Strafe für einen verpassten Tag. |
| Strafbuch | Dokumentation aller verhängten und aufgehobenen Strafen. |

## 3. Spielregeln

### 3.1 Daily Quest und Einträge

- Pflicht pro Challenge-Tag: mindestens 100 Wiederholungen je Pflichtübung.
- Erfasst wird in beliebig vielen Sätzen. Schnelltasten +10, +20, +25 sowie freie Eingabe (1 bis 500 pro Satz).
- Eigene Sätze lassen sich jederzeit korrigieren und löschen, auch rückwirkend.
- Wiederholungen über 100 bleiben gespeichert und zählen für Statistik und BP (Abschnitt 4.3).
- Nachtragen ist unbegrenzt möglich, für jeden vergangenen Challenge-Tag.
- Jeder Satz speichert, für welchen Challenge-Tag er gilt und wann er tatsächlich erfasst wurde. Ein Eintrag gilt als Nachtrag, wenn der Erfassungszeitpunkt nach dem Ende seines Challenge-Tags liegt.

### 3.2 Tagesstatus

Der Status wird pro Hunter und Challenge-Tag aus den Daten abgeleitet, in dieser Reihenfolge:

1. **erfüllt** (grün), wenn jede Pflichtübung an diesem Tag mindestens 100 Wiederholungen hat. Gilt auch, wenn zusätzlich eine Krankmeldung existiert.
2. **krank** (grau), wenn eine Krankmeldung existiert.
3. **offen**, wenn der Tag heute ist.
4. **nicht gewertet** (neutral), wenn der Tag vor dem Wertungsbeginn des Hunters liegt.
5. **verpasst** (rot), in allen übrigen Fällen eines vergangenen Tags.

Ein erfüllter oder krank gemeldeter Tag, der ganz oder teilweise aus Nachträgen besteht, trägt den sichtbaren Vermerk „nachgetragen“.

### 3.3 Auswertung um Mitternacht

- Um 00:00 Uhr Europe/Berlin wertet der Server den gerade beendeten Challenge-Tag für jeden aktiven Hunter aus.
- Ist der Status **verpasst**, entsteht ein Verpasst-Ereignis. Es erscheint im Feed, und eine Abstimmung startet (Abschnitt 3.6).
- Die Auswertung ist idempotent, pro Hunter und Tag entsteht höchstens ein offenes Verpasst-Ereignis.
- War der Server um Mitternacht nicht erreichbar, holt er beim Start alle fehlenden Auswertungen nach.
- Der letzte ausgewertete Tag ist der 28.04.2027.

### 3.4 Nachtrag und Krankmeldung heben auf

Wird ein verpasster Tag später **erfüllt** (durch Nachtrag) oder **krank** gemeldet:

- Der Tag wird grün bzw. grau, mit Vermerk „nachgetragen“.
- Eine laufende Abstimmung zu diesem Tag entfällt (Status „entfallen“).
- Eine bereits verhängte Strafe wird **aufgehoben** und bleibt im Strafbuch durchgestrichen sichtbar mit dem Grund („aufgehoben durch Nachtrag“ bzw. „aufgehoben durch Krankmeldung“).
- Der Feed meldet den Nachtrag.

Fällt ein vergangener Tag später wieder unter die Pflicht (Sätze gelöscht oder Krankmeldung entfernt), wird er sofort wieder **verpasst**, und eine neue Abstimmung startet.

### 3.5 Krankmeldung

- Jeder Hunter kann für heute und für jeden vergangenen Challenge-Tag eine Krankmeldung setzen und wieder entfernen. Es gibt kein Limit.
- Die Krankmeldung ist für alle sichtbar (Kalender, Feed, Statusfenster).
- Ein krank gemeldeter Tag bringt kein XP und keine Strafe.

### 3.6 Strafen und Abstimmung

**Strafkatalog**
- Jeder Hunter kann Strafen anlegen. Felder: Titel (Pflicht, max. 80 Zeichen), Beschreibung (optional, max. 500 Zeichen).
- Der Ersteller kann eine Strafe bearbeiten oder archivieren. Archivierte Strafen stehen in neuen Abstimmungen nicht mehr zur Wahl.

**Abstimmung**
- Pro Verpasst-Ereignis gibt es genau eine Abstimmung.
- Stimmberechtigt sind alle aktiven Hunter außer dem Betroffenen, festgehalten zum Startzeitpunkt. Gibt es keinen Stimmberechtigten, entfällt die Abstimmung.
- Zur Wahl stehen alle nicht archivierten Strafen des Katalogs. Jeder Stimmberechtigte kann während der Abstimmung eine neue Strafe vorschlagen. Sie wird damit in den Katalog übernommen und steht sofort zur Wahl.
- Jeder Stimmberechtigte hat eine Stimme und kann sie ändern, solange die Abstimmung läuft.
- Die Abstimmung endet, sobald alle Stimmberechtigten abgestimmt haben. Es gibt kein Zeitlimit.
- Gewinner ist die Strafe mit den meisten Stimmen. Bei Gleichstand entscheidet ein Zufallslos unter den Gleichplatzierten, das Ergebnis vermerkt „per Los“.
- Wer noch nicht abgestimmt hat, bekommt täglich um 18:00 Uhr eine Push-Erinnerung.

**Strafbuch**
- Jedes Ergebnis wird als Eintrag gespeichert: Hunter, Challenge-Tag, Strafe, Zeitpunkt, Status (verhängt oder aufgehoben, mit Grund).
- Die App dokumentiert nur. Die Strafe selbst erledigen die Hunter außerhalb der App, es gibt keinen Erledigt-Status.

### 3.7 Streak

- Der Streak zählt erfüllte Challenge-Tage am Stück, rückwärts ab dem letzten abgeschlossenen Tag. Ist heute schon erfüllt, zählt heute mit.
- Ein krank gemeldeter Tag pausiert den Streak. Er zählt nicht mit, unterbricht aber nicht.
- Ein verpasster Tag beendet den Streak. Tage mit Status „nicht gewertet“ wirken wie Kranktage.
- Weil der Streak aus den Daten abgeleitet wird, repariert ein Nachtrag einen gebrochenen Streak automatisch.
- Angezeigt werden aktueller und längster Streak.

## 4. Level, Rang, Bonuspunkte, Badges

### 4.1 XP und Level

- Jeder erfüllte Challenge-Tag gibt 100 XP. Kranke, verpasste und nicht gewertete Tage geben 0 XP.
- Sei `n` die Anzahl erfüllter Challenge-Tage. Level `L` (1 bis 51) ist erreicht, wenn
  `n ≥ q(L) = 195 × ((L − 1) / 49) ^ 1,6`.
- Das Level ist das höchste `L ≤ 51`, das diese Bedingung erfüllt. Level 1 gilt ab Start.
- Der XP-Balken zeigt den Fortschritt von `100 × q(L)` bis `100 × q(L + 1)` XP (ungerundet), auf Level 51 ist er voll.
- Wirkung: Level 2 mit der ersten Quest, gegen Ende rund 6 Tage pro Level, S-Rang mit 7 Tagen Puffer, Level 51 nur mit allen 202 Tagen.

### 4.2 Rang

| Rang | Level | erreicht mit Quest Nr. | Datum bei durchgehender Erfüllung |
|---|---|---|---|
| E | 1 bis 9 | ab Start | 09.10.2026 |
| D | 10 bis 19 | 13 | 21.10.2026 |
| C | 20 bis 29 | 43 | 20.11.2026 |
| B | 30 bis 39 | 85 | 01.01.2027 |
| A | 40 bis 49 | 136 | 21.02.2027 |
| S | 50 bis 51 | 195 | 21.04.2027 |

### 4.3 Bonuspunkte (BP)

Methode nach Session-RPE (Foster): Trainingslast = Dauer × Anstrengung, unabhängig von der Sportart.

**Stufen** (für jede Sportart gleich)

| Stufe | Faktor | Ausdauer | Kraft |
|---|---|---|---|
| locker | 3 | Unterhaltung problemlos möglich | Sätze fühlen sich leicht an, viele Wiederholungen übrig |
| moderat | 5 | Reden in ganzen Sätzen noch möglich | Etwa 4 bis 5 Wiederholungen im Tank |
| hart | 7 | Nur noch kurze Sätze | Etwa 2 bis 3 Wiederholungen im Tank |
| am Limit | 9 | Reden kaum möglich | Satz bis zum Muskelversagen |

**Formeln**
- Zeit-Übung: `BP = Minuten × Stufenfaktor` (Minuten 1 bis 600).
- Wiederholungs-Übung: `BP = Wiederholungen × Sekunden_pro_Wdh ÷ 60 × Stufenfaktor`.
- Pflichtübungen über 100: Pro Hunter, Tag und Pflichtübung zählen die Wiederholungen über 100 als Wiederholungs-Übung mit 3 Sekunden pro Wiederholung und fester Stufe „hart“. Beispiel 50 extra Liegestütze = 50 × 3 ÷ 60 × 7 = 17,5 BP.
- BP werden exakt gespeichert und ganzzahlig gerundet angezeigt.
- Die BP-Vorschau erscheint beim Erfassen vor dem Speichern.

**Übungskatalog**
- Gemeinsam für alle. Felder: Name, Eingabeart (Zeit oder Wiederholungen), Sekunden pro Wiederholung (nur Wiederholungen, 2 bis 10), Strecke erfassbar (ja/nein), Kategorie „Laufen“ (ja/nein, für den Badge Monatsmarathon), Ersteller.
- Jeder Hunter kann Übungen anlegen. Der Ersteller kann bearbeiten oder archivieren. Änderungen an Sekunden pro Wiederholung wirken nur auf neue Einträge, bestehende behalten ihren gespeicherten BP-Wert.
- Startkatalog, Zeit: Laufen/Joggen (Strecke, Kategorie Laufen), Radfahren (Strecke), Schwimmen (Strecke), Krafttraining/Gym, HIIT/Zirkeltraining, Fußball/Teamsport, Klettern/Bouldern, Wandern (Strecke), Yoga/Mobility, Rudern (Strecke), Seilspringen.
- Startkatalog, Wiederholungen: Klimmzüge (4 s), Dips (3 s), Burpees (4 s), Ausfallschritte (3 s).

**Bonus-Eintrag:** Übung, Challenge-Tag, Minuten oder Wiederholungen, Stufe, optional Strecke in km. Bearbeiten und löschen wie Sätze.

### 4.4 Badges

Badges werden aus den Daten abgeleitet. Wird eine Bedingung durch Löschen oder Korrigieren wieder unerfüllt, verschwindet der Badge. Beim ersten Erreichen gibt es eine System-Meldung und einen Feed-Eintrag.

| Gruppe | Badge | Bedingung |
|---|---|---|
| Durchhalten | Erwacht | Mindestens 1 erfüllter Tag |
| Durchhalten | Double Dungeon überlebt | Streak von mindestens 7 |
| Durchhalten | Unermüdlich | Streak von mindestens 30 |
| Durchhalten | Unaufhaltsam | Streak von mindestens 100 |
| Durchhalten | Arise | 7 erfüllte Tage am Stück (Kranktage pausieren) unmittelbar nach einem verpassten Tag |
| Durchhalten | Shadow Monarch | Alle 202 Challenge-Tage erfüllt |
| Rang | Rang D, C, B, A, S | Rang erreicht |
| Volumen | Liegestütze I bis IV | Gesamt 1.000 / 5.000 / 10.000 / 20.000 Liegestütze |
| Volumen | Kniebeugen I bis IV | Gesamt 1.000 / 5.000 / 10.000 / 20.000 Kniebeugen |
| Volumen | Sit-ups I bis IV | Gesamt 1.000 / 5.000 / 10.000 / 20.000 Sit-ups |
| Bonus | Overtime | Erstmals an einem Tag über 100 bei einer Pflichtübung |
| Bonus | Extra-Meile | Mindestens 1.000 BP gesamt |
| Bonus | Gate-Brecher | Mindestens 10.000 BP gesamt |
| Bonus | Monatsmarathon | Mindestens 42,2 km in Übungen der Kategorie Laufen innerhalb eines Kalendermonats |
| Spaß | Frühaufsteher | Daily Quest live (kein Nachtrag) vor 08:00 Uhr erfüllt |
| Spaß | Last Minute | Daily Quest live zwischen 23:00 und 23:59 Uhr erfüllt |
| Spaß | Penalty Zone | Erste verhängte, nicht aufgehobene Strafe |
| Spaß | Richter | 10 abgegebene Stimmen in beendeten Abstimmungen |

„Live erfüllt“ heißt, der Satz, der die Daily Quest komplettiert, wurde am selben Challenge-Tag erfasst. Maßgeblich ist sein Erfassungszeitpunkt.

## 5. Screens und Bedienung

**Navigation:** Mobil eine Leiste unten, Desktop eine Seitenleiste links. Bereiche: Quest, Statistik, Rangliste, Feed, Strafen. Profil über das Avatar oben rechts. Offene Abstimmungen zeigen eine Zahl am Symbol „Strafen“.

**Quest (Startseite)**
- Countdown „TAGE BIS KALABRIEN“, Tag x von 202, Fortschrittsbalken, Abflugdatum.
- Hunter-Karte: Rang, Level, XP-Balken, aktueller Streak.
- Daily Quest: drei Pflichtübungen mit Zähler [x/100], Fortschrittsbalken, Schnelltasten, freie Eingabe, aufklappbare Satzliste mit Bearbeiten und Löschen, Timer bis Mitternacht, Warnhinweis.
- Bonus: Liste des Tages mit BP, Knopf „Zusatzübung eintragen“ öffnet ein Formular mit BP-Vorschau.
- Knopf „Krank melden“ mit Bestätigung in der Seite (kein Browser-Dialog).
- „Hunter heute“: Stand aller Hunter (CLEAR, x/300, krank).
- Tageswahl über einen Kalender, um vergangene Tage zu öffnen und nachzutragen.
- Desktop: zweispaltig, links Quest und Bonus, rechts Hunter heute und die letzten Feed-Einträge.

**Statistik**
- Filter: Zeitraum (7 Tage, 30 Tage, gesamt, frei wählbar), Personen (Mehrfachauswahl), Übung (einzelne Pflichtübung, Bonus, alle), Ansicht (pro Tag, pro Woche, kumuliert).
- Diagramme: gestapelte Balken pro Tag nach Übung, kumulierte Linien im Personenvergleich, Kalender-Heatmap mit Tagesstatus, BP-Verlauf.
- Kennzahlen: Summen je Übung, Durchschnitt pro Tag, bester Tag, BP gesamt, Anzahl erfüllter, kranker und verpasster Tage.
- Diagramme per Touch und Maus zoombar. Bibliothek: Apache ECharts.

**Rangliste**
- Gesamtrangliste: Sortierung nach Level, bei Gleichstand nach BP.
- Bonuswertung: Sortierung nach BP, filterbar nach Zeitraum.
- Streak-Vergleich: aktueller und längster Streak.
- Tipp auf eine Person öffnet ihr Statusfenster: Rang, Level, XP, Badges, Summen, Kalender, Strafbuch-Auszug.

**Feed**
- Chronologisch, live aktualisiert. Ereignisse: Satz oder Bonus erfasst (zusammengefasst pro Hunter und Stunde), Daily Quest erfüllt, Level-up, Rangaufstieg, Badge, Tag verpasst, Krankmeldung, Nachtrag, Abstimmung gestartet, Strafe verhängt, Strafe aufgehoben.
- Reaktionen: 🔥 💪 😂 👀, je eine pro Typ und Person, umschaltbar. Keine Kommentare.

**Strafen**
- Offene Abstimmungen oben (eigene Stimme abgeben oder ändern, neue Strafe vorschlagen).
- Strafkatalog: Liste, anlegen, bearbeiten, archivieren.
- Strafbuch: alle Ergebnisse, aufgehobene durchgestrichen mit Grund.

**Profil und Einstellungen**
- Anzeigename (eindeutig), Avatar-Farbe (Initialen auf Farbfläche), Passwort ändern.
- Push: Hauptschalter sowie Einzelschalter für Abenderinnerung (Uhrzeit wählbar, Standard 20:00) und Abstimmungen.
- Sound: an/aus, Standard aus.
- Installationsanleitung für iPhone (Teilen, „Zum Home-Bildschirm“) und Android.
- Admin-Bereich (nur Admin): Einladungslink erzeugen, Hunter deaktivieren, Backup herunterladen.

**System-Meldungen**
- Animierte Overlays im Shadow-Monarch-Stil für Daily Quest erfüllt, Level-up, Rangaufstieg (größer inszeniert), neuer Badge, Abstimmung gestartet.
- Beim Öffnen der App nach einem neuen Verpasst-Ereignis eines anderen Hunters erscheint eine rote „WARNING“-Meldung.
- `prefers-reduced-motion` schaltet Animationen ab.

**Offline**
- Die App startet ohne Netz aus dem Cache.
- Sätze, Bonus-Einträge und Krankmeldungen ohne Netz landen in einer lokalen Warteschlange mit eindeutiger ID und werden automatisch gesendet, sobald wieder Netz da ist. Doppelte Übertragungen werden serverseitig über die ID erkannt.

## 6. Visuelles Design

- Richtung **Shadow Monarch** (Stilprobe B): sehr dunkler Hintergrund mit violettem Schimmer, violettes Leuchten, Panels mit Eckklammern, runder Rang-Kreis, großer Countdown.
- Schriften: Oxanium für System-Texte und Zahlen, Barlow für Fließtext. Beide werden selbst gehostet (keine Anfrage an Google).
- Farbsemantik: Erfüllt Türkis/Grün, Krank Grau, Verpasst Rot, Akzent Violett.
- Mobile first ab 360 px Breite, Desktop mit mehrspaltigem Layout.
- Eigener App-Name „Level Up · Kalabrien“, eigenes Icon. Keine Originalgrafiken, Logos oder Figuren aus Solo Leveling.
- Referenz: https://claude.ai/artifact/Jwb7b6GEdcYKbRJhxAbDVR

## 7. Konten und Sicherheit

- Registrierung nur per Einladungslink. Ein Link ist einmal nutzbar und 7 Tage gültig.
- Beim ersten Start erzeugt der Server einen Admin-Einladungslink und schreibt ihn ins Log.
- Passwörter mit Argon2id gehasht, mindestens 10 Zeichen.
- Sitzung per HttpOnly-, Secure-, SameSite-Cookie, 180 Tage gültig, verlängert sich bei Nutzung.
- Login-Bremse: nach 5 Fehlversuchen pro Konto und IP 15 Minuten Sperre.
- Nur HTTPS. Schutz gegen Cross-Site-Anfragen über die Origin-Prüfung von SvelteKit.
- Gespeichert werden nur Anzeigename, Passwort-Hash und die Sportdaten. Kein Tracking, keine externen Dienste.
- Alle Hunter sehen alle Daten der Gruppe.
- Deaktivierte Hunter können sich nicht mehr anmelden, werden nicht mehr ausgewertet und sind in Abstimmungen nicht stimmberechtigt. Ihre Daten bleiben sichtbar.
- Wird ein Hunter deaktiviert, entfallen seine laufenden Abstimmungen als Betroffener. In laufenden Abstimmungen anderer wird er aus den Stimmberechtigten entfernt, damit sie enden können.

## 8. Technik

| Baustein | Wahl |
|---|---|
| Framework | SvelteKit 2 mit Svelte 5, TypeScript, adapter-node |
| Datenbank | SQLite (better-sqlite3), Drizzle ORM mit versionierten Migrationen |
| Zeitrechnung | Alle Tagesgrenzen in Europe/Berlin, Bibliothek mit Zeitzonen-Unterstützung |
| Live-Updates | Server-Sent Events |
| Push | Web Push mit VAPID-Schlüsseln |
| Zeitsteuerung | Scheduler im Serverprozess |
| Diagramme | Apache ECharts |
| PWA | Web-App-Manifest, Service Worker für App-Cache und Offline-Warteschlange |
| Tests | Vitest (Logik), Playwright (Abläufe) |
| Container | Ein Docker-Image, Daten im Volume `/data` |

**Geplante Jobs**

| Zeit (Europe/Berlin) | Job |
|---|---|
| 00:00 | Auswertung des Vortags (Abschnitt 3.3) |
| minütlich | Abenderinnerungen für Hunter, deren eingestellte Uhrzeit erreicht ist und deren Daily Quest offen ist |
| 18:00 | Erinnerung an offene Abstimmungen |
| 03:00 | Datenbank-Snapshot |
| Serverstart | Nachholen fehlender Auswertungen |

**Datenmodell (fachlich)**
- Hunter: Anzeigename, Avatar-Farbe, Passwort-Hash, Rolle, aktiv, Registrierungsdatum, Einstellungen (Push, Erinnerungszeit, Sound).
- Sitzung, Einladung, Push-Abo.
- Satz: Hunter, Challenge-Tag, Pflichtübung, Wiederholungen, Erfassungszeitpunkt, Client-ID.
- Krankmeldung: Hunter, Challenge-Tag, Erfassungszeitpunkt.
- Katalogübung und Bonus-Eintrag (mit gespeichertem BP-Wert).
- Verpasst-Ereignis: Hunter, Challenge-Tag, Status (aktiv, aufgehoben).
- Strafe (Katalog), Abstimmung, Stimme, Strafbuch-Eintrag.
- Feed-Ereignis, Reaktion, erreichter Badge (mit Zeitpunkt der ersten Erreichung).
- Konfiguration: Go-live-Datum, Challenge-Start, Challenge-Ende, Abflugdatum.

Tagesstatus, XP, Level, Rang, Streak und Badges werden aus diesen Daten berechnet, nicht separat gepflegt. Die Berechnungen liegen als reine, testbare Funktionen in einem eigenen Modul ohne Datenbankzugriff.

## 9. Betrieb

- **Code:** Privates GitHub-Repo in Tobias' Account, lokal unter `C:\Users\TobiasHeinze\Documents\level-up-kalabrien`. Niklas bekommt Lesezugriff.
- **Deployment:** Auf dem Server `git pull` und `docker compose up -d --build`. Konfiguration über Umgebungsvariablen (öffentliche URL, VAPID-Schlüssel, Go-live-Datum).
- **HTTPS:** Domain oder Subdomain plus Reverse Proxy. Falls keiner vorhanden ist, Caddy mit automatischen Zertifikaten.
- **Backups:** Nächtlicher Snapshot nach `/data/backups`, 14 Tage aufbewahrt. Admin kann jederzeit einen aktuellen Snapshot herunterladen.
- **Server-Sicherheit:** Kurze Checkliste für Niklas (Firewall nur 22, 80, 443; automatische Sicherheitsupdates; SSH nur per Schlüssel).
- **Voraussetzungen vor dem Deployment:** Antworten von Niklas zu Betriebssystem, Docker, Reverse Proxy, Domain, Zugang, Backups und Kapazität; GitHub-Zugang für Niklas.

## 10. Tests und Abnahme

**Automatische Tests (Vitest), mindestens:**
- Tagesstatus für alle fünf Zustände, inklusive Wertungsbeginn und Go-live.
- Auswertung um Mitternacht, Idempotenz, Nachholen nach Ausfall.
- Nachtrag und Krankmeldung heben Abstimmung und verhängte Strafe auf. Rückfall unter die Pflicht startet eine neue Abstimmung.
- Streak mit Kranktagen, verpassten und nicht gewerteten Tagen.
- Level-Kurve an den Grenzen (Level 2, 10, 20, 30, 40, 50, 51) und XP-Balken.
- BP für Zeit-Übungen, Wiederholungs-Übungen und Extra-Wiederholungen.
- Alle Badge-Bedingungen inklusive Entzug.
- Abstimmung: Stimmberechtigte, Stimme ändern, Ende bei vollständiger Abstimmung, Gleichstand per Los, Vorschlag neuer Strafe.
- Zeitumstellung am 25.10.2026 und am 28.03.2027.

**Abläufe (Playwright):** Einladung, Registrierung, Login, Sätze erfassen bis „QUEST COMPLETE“, Nachtrag für einen vergangenen Tag, Krankmeldung, Abstimmung mit zwei Hunters, Bonus-Eintrag.

**Manuelle Abnahme vor Go-live:** Installation und Push auf einem echten iPhone und einem echten Android-Handy, Offline-Eintrag mit anschließender Synchronisation, Desktop-Ansicht.

## 11. Nicht im Umfang

- Native Apps in App Store oder Play Store.
- Kommentare im Feed, Chat.
- Profilfotos (nur Initialen auf Farbe).
- Erledigt-Status für Strafen.
- Wochenwertung und Wochensieger.
- Stats-Werte wie STR, AGI, VIT.
- Mehrere parallele Challenges oder Gruppen.
