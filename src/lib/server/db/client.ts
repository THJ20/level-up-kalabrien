import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { runMigrations } from './migrate';
import * as schema from './schema';
import { seedCatalog } from './seed';

export type AppDb = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** Öffnet die Datenbank, setzt die Pragmas, migriert und spielt den Startkatalog ein. */
export function openDatabase(path: string, now: Date = new Date()): AppDb {
	const sqlite = new Database(path);
	if (path !== ':memory:') sqlite.pragma('journal_mode = WAL');
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	runMigrations(sqlite, now);
	const db = drizzle(sqlite, { schema });
	seedCatalog(db, now);
	return db;
}
