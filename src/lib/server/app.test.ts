import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { and, eq } from 'drizzle-orm';
import { createApp, type App } from './app';
import { createSnapshot, dailySnapshot, pruneSnapshots } from './backup';
import { SCHEDULE } from './scheduler';
import { missedDays } from './db/schema';
import { FakeClock, createTestContext, insertHunter } from './testing';
import type { AppConfig } from './config';

const cleanup: (() => void)[] = [];
afterEach(() => {
	while (cleanup.length > 0) cleanup.pop()?.();
});

function tempDir(): string {
	const dir = mkdtempSync(join(tmpdir(), 'level-up-'));
	cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
	return dir;
}

function startApp(config: AppConfig, log: string[]): App {
	const app = createApp(config, {
		clock: new FakeClock('2026-10-15T10:00:00Z'),
		transport: { send: async () => ({ statusCode: 201 }) },
		startJobs: false,
		log: (line) => log.push(line),
		generateVapidKeys: () => ({ publicKey: 'pub', privateKey: 'priv' })
	});
	cleanup.push(() => app.stop());
	return app;
}

describe('App', () => {
	it('gibt beim ersten Start den Admin-Link aus und holt danach verpasste Tage nach', () => {
		const dir = tempDir();
		const config: AppConfig = {
			databasePath: join(dir, 'app.db'),
			backupDir: join(dir, 'backups'),
			avatarDir: join(dir, 'avatars'),
			goLiveDate: '2026-10-12',
			origin: 'https://lvl.test',
			vapidSubject: 'https://lvl.test',
			simulatedNow: null
		};
		const firstLog: string[] = [];
		const first = startApp(config, firstLog);
		expect(firstLog.filter((line) => line.includes('https://lvl.test/register?token='))).toHaveLength(1);
		expect(first.vapid).toEqual({ publicKey: 'pub', privateKey: 'priv' });
		const tobias = insertHunter(first.ctx, 'Tobias', { registeredOn: '2026-10-12' });
		first.stop();

		const secondLog: string[] = [];
		const second = startApp(config, secondLog);
		expect(secondLog.some((line) => line.includes('/register?token='))).toBe(false);
		const active = second.ctx.db
			.select()
			.from(missedDays)
			.where(and(eq(missedDays.hunterId, tobias), eq(missedDays.status, 'active')))
			.all();
		expect(active.map((row) => row.date).sort()).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
	});
});

describe('Snapshots', () => {
	it('sind lesbare Kopien der Datenbank', () => {
		const ctx = createTestContext();
		insertHunter(ctx, 'Tobias');
		const dir = tempDir();
		const path = createSnapshot(ctx, dir, 'kopie.db');
		const copy = new Database(path, { readonly: true });
		expect(copy.prepare('SELECT name FROM hunters').pluck().all()).toEqual(['Tobias']);
		copy.close();
		expect(dailySnapshot(ctx, dir)).toMatch(/app-2026-10-12\.db$/);
	});

	it('behalten nur die neuesten Tages-Snapshots', () => {
		const dir = tempDir();
		for (let day = 1; day <= 16; day += 1) {
			writeFileSync(join(dir, `app-2026-10-${String(day).padStart(2, '0')}.db`), '');
		}
		writeFileSync(join(dir, 'anderes.txt'), '');
		pruneSnapshots(dir, 14);
		const files = readdirSync(dir).sort();
		expect(files).toHaveLength(15);
		expect(files[0]).toBe('anderes.txt');
		expect(files[1]).toBe('app-2026-10-03.db');
	});
});

describe('Zeitplan', () => {
	it('enthält die vier Jobs', () => {
		expect(SCHEDULE).toEqual({
			evaluate: '0 0 * * *',
			eveningReminders: '* * * * *',
			voteReminders: '0 18 * * *',
			snapshot: '0 3 * * *'
		});
	});
});
