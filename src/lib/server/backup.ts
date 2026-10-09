import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { todayOf, type ServiceContext } from './context';

const DAILY_SNAPSHOT = /^app-\d{4}-\d{2}-\d{2}\.db$/;

/** Schreibt eine konsistente Kopie der Datenbank (SQLite `VACUUM INTO`) und liefert ihren Pfad. */
export function createSnapshot(ctx: ServiceContext, dir: string, fileName: string): string {
	mkdirSync(dir, { recursive: true });
	const path = join(dir, fileName);
	if (existsSync(path)) rmSync(path);
	ctx.db.$client.prepare('VACUUM INTO ?').run(path);
	return path;
}

/** Entfernt alte Tages-Snapshots und behält die neuesten `keep`. */
export function pruneSnapshots(dir: string, keep: number): string[] {
	const daily = readdirSync(dir)
		.filter((file) => DAILY_SNAPSHOT.test(file))
		.sort();
	const removed = daily.slice(0, Math.max(0, daily.length - keep));
	for (const file of removed) rmSync(join(dir, file));
	return removed;
}

export function dailySnapshot(ctx: ServiceContext, dir: string, keep = 14): string {
	const path = createSnapshot(ctx, dir, `app-${todayOf(ctx)}.db`);
	pruneSnapshots(dir, keep);
	return path;
}
