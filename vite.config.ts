import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			// Öffentliche Adresse der App. Der Node-Adapter liest sie nur beim Bauen, nicht beim Start.
			// Ohne Angabe gilt HTTPS mit dem Host aus der Anfrage (passt hinter einem HTTPS-Proxy).
			paths: { origin: process.env.ORIGIN || undefined }
		})
	],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
