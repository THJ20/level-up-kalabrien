import { dirname, join } from 'node:path';
import { isLocalDate, type LocalDate } from '#lib/domain/index.ts';

export interface AppConfig {
	databasePath: string;
	backupDir: string;
	/** Ordner für hochgeladene Profilbilder. */
	avatarDir: string;
	goLiveDate: LocalDate | null;
	/** Öffentliche Adresse ohne abschließenden Schrägstrich, z. B. `https://levelup.example.de`. */
	origin: string | null;
	vapidSubject: string;
}

function read(env: Record<string, string | undefined>, key: string): string | null {
	const value = env[key]?.trim();
	return value ? value : null;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
	const databasePath = read(env, 'DATABASE_PATH') ?? 'data/app.db';
	const goLiveDate = read(env, 'GO_LIVE_DATE');
	if (goLiveDate !== null && !isLocalDate(goLiveDate)) {
		throw new Error(`GO_LIVE_DATE muss im Format JJJJ-MM-TT sein, ist aber "${goLiveDate}".`);
	}
	const origin = read(env, 'ORIGIN')?.replace(/\/+$/, '') ?? null;
	return {
		databasePath,
		backupDir: read(env, 'BACKUP_DIR') ?? join(dirname(databasePath), 'backups'),
		avatarDir: read(env, 'AVATAR_DIR') ?? join(dirname(databasePath), 'avatars'),
		goLiveDate,
		origin,
		vapidSubject: read(env, 'VAPID_SUBJECT') ?? origin ?? 'mailto:level-up@example.invalid'
	};
}
