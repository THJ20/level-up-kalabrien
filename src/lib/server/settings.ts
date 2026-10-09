import { eq } from 'drizzle-orm';
import { isLocalDate, type LocalDate } from '#lib/domain/index.ts';
import { todayOf, type ServiceContext } from './context';
import { settings } from './db/schema';
import { invalid } from './errors';

const GO_LIVE_KEY = 'go_live_date';

/** Setzt das Go-live-Datum beim ersten Aufruf (Konfiguration oder heute) und liefert es danach unverändert. */
export function ensureGoLiveDate(ctx: ServiceContext, configured?: LocalDate): LocalDate {
	const existing = ctx.db.select().from(settings).where(eq(settings.key, GO_LIVE_KEY)).get();
	if (existing) return existing.value;
	const value = configured ?? todayOf(ctx);
	if (!isLocalDate(value)) throw invalid(`Ungültiges Go-live-Datum: ${value}`);
	ctx.db.insert(settings).values({ key: GO_LIVE_KEY, value }).run();
	return value;
}

export function getGoLiveDate(ctx: ServiceContext): LocalDate {
	return ensureGoLiveDate(ctx);
}
