// Erzeugt in der lokalen Entwicklungs-Datenbank eine offene Strafabstimmung zum Ansehen der Oberfläche.
// Aufruf bei laufendem Dev-Server: node scripts/dev-vote.mjs [Basis-URL]
import Database from 'better-sqlite3';

const base = process.argv[2] ?? 'http://localhost:5173';
const db = new Database('data/dev.db');
const steffen = db.prepare("SELECT id FROM hunters WHERE name = 'Steffen'").get();
const sickDay = db.prepare('SELECT date FROM sick_notes WHERE hunter_id = ? ORDER BY date LIMIT 1').get(steffen.id).date;
// Alle ab Tag 1 registriert und Go-live am Start, damit leere Tage als verpasst gelten.
db.prepare("UPDATE hunters SET registered_on = '2026-10-12'").run();
db.prepare("UPDATE settings SET value = '2026-10-12' WHERE key = 'go_live_date'").run();
db.close();

const login = await fetch(`${base}/api/auth/login`, {
	method: 'POST',
	headers: { 'content-type': 'application/json', origin: base },
	body: JSON.stringify({ name: 'Steffen', password: 'dev-passwort-123' })
});
const cookie = login.headers.get('set-cookie')?.split(';')[0];
const response = await fetch(`${base}/api/sick/${sickDay}`, {
	method: 'DELETE',
	headers: { 'content-type': 'application/json', origin: base, cookie }
});
console.log(response.ok ? `Steffen hat den ${sickDay} jetzt verpasst, Abstimmung offen.` : await response.text());
