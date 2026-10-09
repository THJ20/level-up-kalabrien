import { readFileSync, rmSync } from 'node:fs';
import { assertAdmin } from '#lib/server/admin.ts';
import { getApp } from '#lib/server/app.ts';
import { createSnapshot } from '#lib/server/backup.ts';
import { todayOf } from '#lib/server/context.ts';
import { api } from '#lib/server/http.ts';

export const GET = api((_event, hunter) => {
	const app = getApp();
	assertAdmin(app.ctx, hunter.id);
	const path = createSnapshot(app.ctx, app.config.backupDir, `download-${crypto.randomUUID()}.db`);
	try {
		const file = readFileSync(path);
		return new Response(file, {
			headers: {
				'content-type': 'application/vnd.sqlite3',
				'content-disposition': `attachment; filename="level-up-backup-${todayOf(app.ctx)}.db"`,
				'cache-control': 'no-store'
			}
		});
	} finally {
		rmSync(path, { force: true });
	}
});
