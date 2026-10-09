import type { ServiceContext } from './context';

/** Führt `fn` in einer Transaktion aus. Läuft bereits eine, wird sie mitbenutzt statt verschachtelt. */
export function inTransaction<T>(ctx: ServiceContext, fn: () => T): T {
	if (ctx.db.$client.inTransaction) return fn();
	return ctx.db.transaction(() => fn());
}
