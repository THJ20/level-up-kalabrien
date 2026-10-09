import { describe, expect, it } from 'vitest';
import { createChangeBus } from './context';
import { createEventStream } from './sse';

const decoder = new TextDecoder();

async function readText(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
	const { value } = await reader.read();
	return value ? decoder.decode(value) : '';
}

describe('Live-Updates', () => {
	it('melden Bereitschaft, liefern Änderungen und enden beim Abbruch', async () => {
		const bus = createChangeBus();
		const abort = new AbortController();
		const reader = createEventStream(bus, abort.signal).getReader();

		expect(await readText(reader)).toContain('event: ready');
		bus.publish(['feed', 'board']);
		expect(await readText(reader)).toBe('event: change\ndata: ["feed","board"]\n\n');

		abort.abort();
		expect((await reader.read()).done).toBe(true);
		expect(() => bus.publish(['votes'])).not.toThrow();
	});

	it('schickt regelmäßig einen Herzschlag', async () => {
		const abort = new AbortController();
		const reader = createEventStream(createChangeBus(), abort.signal, 10).getReader();
		await readText(reader);
		expect(await readText(reader)).toBe(': ping\n\n');
		abort.abort();
	});
});
