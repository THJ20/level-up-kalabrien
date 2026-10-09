import type Database from 'better-sqlite3';
import journal from './migrations/meta/_journal.json';

const sources = import.meta.glob('./migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** Führt die von drizzle-kit erzeugten Migrationen aus, die im Build eingebettet sind. */
export function runMigrations(sqlite: Database.Database, now: Date): void {
	sqlite.exec(
		'CREATE TABLE IF NOT EXISTS __migrations (tag TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)'
	);
	const applied = new Set(sqlite.prepare('SELECT tag FROM __migrations').pluck().all() as string[]);

	for (const entry of journal.entries) {
		if (applied.has(entry.tag)) continue;
		const source = sources[`./migrations/${entry.tag}.sql`];
		if (source === undefined) throw new Error(`Migration ${entry.tag} fehlt`);
		const statements = source
			.split('--> statement-breakpoint')
			.map((statement) => statement.trim())
			.filter((statement) => statement.length > 0);

		sqlite.transaction(() => {
			for (const statement of statements) sqlite.exec(statement);
			sqlite
				.prepare('INSERT INTO __migrations (tag, applied_at) VALUES (?, ?)')
				.run(entry.tag, now.getTime());
		})();
	}
}
