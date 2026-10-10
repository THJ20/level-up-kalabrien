// Erzeugt in der lokalen Entwicklungs-Datenbank eine offene Strafabstimmung zum Ansehen der Oberfläche.
// Aufruf bei laufendem Dev-Server: node scripts/dev-vote.mjs [Basis-URL]
import Database from 'better-sqlite3';

const base = process.argv[2] ?? 'http://localhost:5173';
const db = new Database('data/dev.db');
db.prepare("UPDATE hunters SET registered_on = '2026-10-09'").run();
db.close();

const login = await fetch(`${base}/api/auth/login`, {
	method: 'POST',
	headers: { 'content-type': 'application/json', origin: base },
	body: JSON.stringify({ name: 'Steffen', password: 'dev-passwort-123' })
});
const cookie = login.headers.get('set-cookie')?.split(';')[0];
const response = await fetch(`${base}/api/sick/2026-10-09`, {
	method: 'DELETE',
	headers: { origin: base, cookie }
});
console.log(response.ok ? 'Steffen hat den 09.10. jetzt verpasst, Abstimmung offen.' : await response.text());
