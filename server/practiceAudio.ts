import type { Plugin } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function command(executable: string, args: string[], input = ''): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Audio timeout')); }, 20000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.resume();
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(output) : reject(new Error('Audio command failed')); });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

export function selectAmericanVoice(list: string): string | undefined {
  const voices = list.split('\n').map(line => line.match(/^(.+?)\s+(en_[A-Za-z_]+)\s+#/)).filter(Boolean);
  const american = voices.filter(item => item![2] === 'en_US');
  const voice = american.find(item => item![1].trim() === 'Samantha') || american[0];
  return voice?.[1].trim();
}

export async function renderMacAudio(text: string): Promise<Buffer> {
  const list = await command('/usr/bin/say', ['-v', '?']);
  const voice = selectAmericanVoice(list);
  if (!voice) throw new Error('No American English voice');
  const directory = await mkdtemp(join(tmpdir(), 'mikey-audio-'));
  try {
    const source = join(directory, 'sentence.aiff');
    const target = join(directory, 'sentence.wav');
    await command('/usr/bin/say', ['-v', voice, '-r', '175', '-o', source], text);
    await command('/usr/bin/afconvert', ['-f', 'WAVE', '-d', 'LEI16', source, target]);
    return await readFile(target);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export function practiceAudioPlugin(render = renderMacAudio, platform = process.platform): Plugin {
  const cache = new Map<string, Buffer>();
  let busy = false;
  return {
    name: 'mikey-practice-audio',
    configureServer(server) {
      server.middlewares.use('/api/practice-audio', async (req, res) => {
        const fail = (status: number) => { res.statusCode = status; res.end(); };
        if (req.method !== 'POST') { fail(405); return; }
        if (platform !== 'darwin') { fail(501); return; }
        try {
          if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { fail(403); return; }
        } catch { fail(403); return; }
        if (!req.headers['content-type']?.startsWith('application/json')) { fail(415); return; }
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk.toString();
            if (Buffer.byteLength(body) > 8192) { fail(413); return; }
          }
          const { text } = JSON.parse(body);
          if (typeof text !== 'string' || !text.trim() || text.length > 1000) { fail(400); return; }
          let bytes = cache.get(text);
          if (!bytes) {
            if (busy) { fail(429); return; }
            busy = true;
            try { bytes = await render(text); } finally { busy = false; }
            if (cache.size >= 16) cache.delete(cache.keys().next().value!);
            cache.set(text, bytes);
          }
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Cache-Control', 'no-store');
          res.end(bytes);
        } catch { fail(503); }
      });
    },
  };
}
