/** localStorage-Zugriff, der nie wirft (privater Modus, gesperrter Speicher). */
export function readJson<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export function writeJson(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Speicher ist optional.
	}
}
