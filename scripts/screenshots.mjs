// Macht Screenshots aller Seiten in Handy- und Desktop-Breite (lokale Entwicklung, Edge über Playwright).
// Aufruf: node scripts/screenshots.mjs <Ausgabeordner> [Basis-URL] [Hunter-Name]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const [outDir = 'screenshots', base = 'http://localhost:5173', user = 'Tobias'] = process.argv.slice(2);
const PASSWORD = 'dev-passwort-123';
const pages = ['/', '/plan', '/statistik', '/rangliste', '/erfolge', '/feed', '/strafen', '/profil'];
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const problems = [];
for (const viewport of [
	{ name: 'handy', width: 390, height: 844, isMobile: true },
	{ name: 'desktop', width: 1280, height: 860, isMobile: false }
]) {
	const context = await browser.newContext({
		viewport: { width: viewport.width, height: viewport.height },
		isMobile: viewport.isMobile,
		deviceScaleFactor: 1,
		serviceWorkers: 'block'
	});
	const page = await context.newPage();
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(`${viewport.name} ${page.url()}: ${message.text()}`);
	});
	page.on('pageerror', (error) => problems.push(`${viewport.name} ${page.url()}: ${error.message}`));
	const login = await page.request.post(`${base}/api/auth/login`, {
		data: { name: user, password: PASSWORD },
		headers: { origin: base }
	});
	if (!login.ok()) throw new Error(`Login fehlgeschlagen: ${login.status()}`);
	for (const path of pages) {
		await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120_000 });
		await page.waitForTimeout(800);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
		if (overflow) problems.push(`${viewport.name} ${path}: horizontales Scrollen`);
		const file = `${outDir}/${viewport.name}${path === '/' ? '-quest' : path.replace(/\//g, '-')}.png`;
		await page.screenshot({ path: file, fullPage: true });
		console.log(file);
	}
	await context.close();
}
await browser.close();
console.log(problems.length ? `PROBLEME:\n${problems.join('\n')}` : 'Keine Konsolenfehler, kein horizontales Scrollen.');
