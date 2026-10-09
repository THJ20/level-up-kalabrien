import { eq } from 'drizzle-orm';
import { invalidateHunterSessions } from './auth/sessions';
import type { ServiceContext } from './context';
import { hunters } from './db/schema';
import { forbidden, invalid } from './errors';
import { getHunter } from './hunters';
import { inTransaction } from './transaction';
import { removeHunterFromVotes } from './votes';

export function assertAdmin(ctx: ServiceContext, hunterId: string): void {
	if (getHunter(ctx, hunterId).role !== 'admin') throw forbidden('Das darf nur der Admin.');
}

/** Deaktiviert einen Hunter: kein Login mehr, keine Auswertung, raus aus allen offenen Abstimmungen. */
export function deactivateHunter(ctx: ServiceContext, adminId: string, hunterId: string): void {
	assertAdmin(ctx, adminId);
	if (adminId === hunterId) throw invalid('Du kannst dich nicht selbst deaktivieren.');
	getHunter(ctx, hunterId);
	inTransaction(ctx, () => {
		ctx.db.update(hunters).set({ active: false }).where(eq(hunters.id, hunterId)).run();
		invalidateHunterSessions(ctx, hunterId);
		removeHunterFromVotes(ctx, hunterId);
	});
	ctx.bus.publish(['hunters', 'board', 'votes', 'feed']);
}
