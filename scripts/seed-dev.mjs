// Legt lokale Testdaten über die API an. Nur für die Entwicklungs-Datenbank gedacht.
// Aufruf: node scripts/seed-dev.mjs <Admin-Token aus dem Server-Log> [Basis-URL]
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
	for (const [exercise, reps] of Object.entries(values)) {
		if (reps > 0) await call('/api/sets', { cookie, body: { date, exercise, reps } });
	}
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

const yesterday = '2026-10-09';
const today = '2026-10-10';
const full = { pushups: 100, squats: 100, situps: 100 };

await sets(hunters.Niklas, yesterday, full);
await sets(hunters.Niklas, today, { pushups: 120, squats: 100, situps: 100 });
await sets(hunters.Ramzy, yesterday, full);
await sets(hunters.Ramzy, today, { pushups: 60, squats: 40, situps: 0 });
await call(`/api/sick/${yesterday}`, { method: 'PUT', cookie: hunters.Steffen });
await sets(hunters.Steffen, today, { pushups: 100, squats: 50, situps: 25 });
await sets(admin, today, { pushups: 45, squats: 30, situps: 0 });

const { data: catalog } = await call('/api/exercises', { method: 'GET', cookie: admin });
const run = catalog.exercises.find((exercise) => exercise.name === 'Laufen/Joggen');
await call('/api/bonus', {
	cookie: hunters.Niklas,
	body: { exerciseId: run.id, date: today, minutes: 35, effort: 'hard', distanceKm: 6.2 }
});

await call('/api/penalties', { cookie: hunters.Niklas, body: { title: 'Runde Getränke in Kalabrien' } });
await call('/api/penalties', { cookie: hunters.Ramzy, body: { title: '50 Burpees', description: 'Vor allen, mit Video' } });

console.log('Testdaten angelegt: Tobias (Admin), Niklas, Ramzy, Steffen.');
