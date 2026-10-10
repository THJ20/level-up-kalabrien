// Legt lokale Testdaten über die API an. Nur für die Entwicklungs-Datenbank gedacht.
// Aufruf: node scripts/seed-dev.mjs <Admin-Token aus dem Server-Log> [Basis-URL]
// Tipp: Mit SIMULATED_NOW am Server (z. B. 2026-10-20T19:00:00+02:00) gibt es schon gewertete Tage.
// Alle Test-Hunter haben das Passwort DEV_PASSWORD.

const DEV_PASSWORD = 'dev-passwort-123';
const [token, base = 'http://localhost:5173'] = process.argv.slice(2);
if (!token) {
	console.error('Bitte den Admin-Token aus dem Server-Log angeben.');
	process.exit(1);
}

async function call(path, { method = 'POST', body, cookie } = {}) {
	const response = await fetch(base + path, {
		method,
		headers: {
			'content-type': 'application/json',
			origin: base,
			...(cookie ? { cookie } : {})
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
	const setCookie = response.headers.get('set-cookie');
	return { data, cookie: setCookie ? setCookie.split(';')[0] : cookie };
}

async function register(inviteToken, name, color) {
	const { cookie } = await call('/api/auth/register', {
		body: { token: inviteToken, name, password: DEV_PASSWORD, color }
	});
	return cookie;
}

async function sets(cookie, date, values) {
	for (const [exerciseId, value] of Object.entries(values)) {
		if (value > 0) await call('/api/sets', { cookie, body: { date, exerciseId, value } });
	}
}

function addDays(date, days) {
	const value = new Date(`${date}T12:00:00Z`);
	value.setUTCDate(value.getUTCDate() + days);
	return value.toISOString().slice(0, 10);
}

/** Tage vom ersten bis zum letzten Datum (beide inklusive). */
function daysFrom(first, last) {
	const days = [];
	for (let date = first; date <= last; date = addDays(date, 1)) days.push(date);
	return days;
}

const admin = await register(token, 'Tobias', '#a47cff');
const hunters = {};
for (const [name, color] of [
	['Niklas', '#4cc9ff'],
	['Ramzy', '#ff7a45'],
	['Steffen', '#7ef0d0']
]) {
	const { data } = await call('/api/admin/invites', { cookie: admin, body: {} });
	hunters[name] = await register(new URL(data.link).searchParams.get('token'), name, color);
}

const { data: me } = await call('/api/me', { method: 'GET', cookie: admin });
const today = me.summary.today;
const start = '2026-10-12';
const past = today > start ? daysFrom(start < addDays(today, -9) ? addDays(today, -9) : start, addDays(today, -1)) : [];
const full = { pushups: 100, squats: 100, situps: 100 };

const { data: catalog } = await call('/api/exercises', { method: 'GET', cookie: admin });
const byName = (name) => catalog.exercises.find((exercise) => exercise.name === name);
const run = byName('Laufen/Joggen');

// Niklas hat einen eigenen Plan, bevor er etwas einträgt. Er gilt deshalb ab Beginn.
const { data: niklasPlan } = await call('/api/plan', {
	method: 'PUT',
	cookie: hunters.Niklas,
	body: {
		items: [
			{ exerciseId: 'pushups', unit: 'reps', target: 80 },
			{ newExercise: { name: 'Plank', kind: 'time' }, unit: 'minutes', target: 3 },
			{ exerciseId: run.id, unit: 'km', target: 2 }
		]
	}
});
const plank = niklasPlan.plan.current.find((item) => item.name === 'Plank').exerciseId;
const niklasFull = { pushups: 80, [plank]: 3, [run.id]: 2 };

await sets(hunters.Niklas, '2026-10-10', niklasFull);
for (const date of past) await sets(hunters.Niklas, date, niklasFull);
await sets(hunters.Niklas, today, { pushups: 95, [plank]: 3, [run.id]: 2.5 });

for (const date of past) await sets(admin, date, full);
await sets(admin, today, { pushups: 45, squats: 30 });

for (const date of past.slice(0, -2)) await sets(hunters.Ramzy, date, full);
await sets(hunters.Ramzy, today, { pushups: 60, squats: 40 });

for (const [index, date] of past.entries()) {
	if (index === 2) await call(`/api/sick/${date}`, { method: 'PUT', cookie: hunters.Steffen });
	else await sets(hunters.Steffen, date, full);
}
await sets(hunters.Steffen, today, { pushups: 100, squats: 50, situps: 25 });

await call('/api/bonus', {
	cookie: hunters.Niklas,
	body: { exerciseId: run.id, date: today, minutes: 35, effort: 'hard', distanceKm: 6.2 }
});

// Avatare, Spielername und Farbschema, damit die Oberfläche alles zeigt.
await call('/api/me/avatar', { method: 'PUT', cookie: hunters.Niklas, body: { preset: '02' } });
await call('/api/me/avatar', { method: 'PUT', cookie: hunters.Ramzy, body: { preset: '05' } });
await call('/api/me', { method: 'PATCH', cookie: hunters.Ramzy, body: { displayName: 'Ramzy the Flame', theme: 'gate' } });

await call('/api/penalties', { cookie: hunters.Niklas, body: { title: 'Runde Getränke in Kalabrien' } });
await call('/api/penalties', { cookie: hunters.Ramzy, body: { title: '50 Burpees', description: 'Vor allen, mit Video' } });

console.log(`Testdaten bis ${today} angelegt: Tobias (Admin), Niklas, Ramzy, Steffen.`);
