// See https://svelte.dev/docs/kit/types#app.d.ts
import type { HunterProfile } from '#lib/server/hunters.ts';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			hunter: HunterProfile | null;
			sessionToken: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
