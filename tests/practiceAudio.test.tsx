// @vitest-environment node
import { Readable } from 'node:stream';
import { expect, it, vi } from 'vitest';
import { practiceAudioPlugin } from '../server/practiceAudio';

async function endpoint(platform: NodeJS.Platform = 'darwin') {
  const render = vi.fn().mockResolvedValue(Buffer.from('RIFF sentence audio'));
  let handler: any;
  const plugin = practiceAudioPlugin(render, platform);
  (plugin.configureServer as any)({ middlewares: { use: (_path: string, callback: any) => { handler = callback; } } });
  async function request(body: string, origin = 'http://localhost:3000') {
    const req = Object.assign(Readable.from([JSON.stringify({ text: body })]), {
      method: 'POST', headers: { host: 'localhost:3000', origin, 'content-type': 'application/json' },
    });
    const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
    await handler(req, res); return res;
  }
  return { render, request };
}
it('renders the full sentence once and reuses the same audio for different listening speeds', async () => {
  const { render, request } = await endpoint();
  const first = await request('My name is Anna.');
  await request('My name is Anna.');
  expect(render).toHaveBeenCalledExactlyOnceWith('My name is Anna.');
  expect(first.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/wav');
  expect(first.end).toHaveBeenCalledWith(Buffer.from('RIFF sentence audio'));
});
it('rejects cross-origin requests and invalid text before starting native commands', async () => {
  const { render, request } = await endpoint();
  expect((await request('hello', 'https://example.com')).statusCode).toBe(403);
  expect((await request('')).statusCode).toBe(400);
  expect((await request('x'.repeat(1001))).statusCode).toBe(400);
  expect(render).not.toHaveBeenCalled();
});
it('reports unsupported platforms without invoking native commands', async () => {
  const { render, request } = await endpoint('linux');
  expect((await request('Hello.')).statusCode).toBe(501);
  expect(render).not.toHaveBeenCalled();
});
