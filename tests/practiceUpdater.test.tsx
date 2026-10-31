// @vitest-environment node
import { mkdtemp, mkdir, writeFile, readFile, rm, lstat, symlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { files, updatePractice, isMainModule } from '../scripts/update-practice-v2.mjs';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function app() {
  const root = await mkdtemp(join(tmpdir(), 'mikey-updater-test-')); roots.push(root);
  await mkdir(join(root, 'src/components/lesson'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
  await writeFile(join(root, 'src/components/lesson/LessonPlayer.tsx'), 'User original code');
  await writeFile(join(root, '.env.local'), 'USER_CONFIG=preserved');
  return root;
}
async function fixtureFetch(input: Parameters<typeof fetch>[0]) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const path = files.find(file => url.endsWith('/' + file.path))!.path;
  return new Response(await readFile(new URL('../' + path, import.meta.url)));
}

it('installs verified files, backs up originals and preserves local settings', async () => {
  const root = await app();
  const result = await updatePractice(root, fixtureFetch);
  expect(result.updated).toBe(files.length);
  for (const file of files) expect(await readFile(join(root, file.path), 'utf8')).toBe(await readFile(new URL('../' + file.path, import.meta.url), 'utf8'));
  expect(await readFile(join(result.backup, 'src/components/lesson/LessonPlayer.tsx'), 'utf8')).toBe('User original code');
  expect(await readFile(join(root, '.env.local'), 'utf8')).toBe('USER_CONFIG=preserved');
  await expect(lstat(join(root, '.mikey-practice-update.lock'))).rejects.toMatchObject({ code: 'ENOENT' });
});

it('rejects a corrupted download before changing any application file', async () => {
  const root = await app();
  await expect(updatePractice(root, async () => new Response('corrupted'))).rejects.toThrow('checksum');
  expect(await readFile(join(root, 'src/components/lesson/LessonPlayer.tsx'), 'utf8')).toBe('User original code');
  await expect(lstat(join(root, 'src/components/lesson/PracticeStudio.tsx'))).rejects.toMatchObject({ code: 'ENOENT' });
});

it('rejects running outside the application and HTTP failures', async () => {
  const root = await app();
  await expect(updatePractice(dirname(root), fixtureFetch)).rejects.toThrow();
  await expect(updatePractice(root, async () => new Response('', { status: 403 }))).rejects.toThrow('HTTP 403');
  expect(await readFile(join(root, 'src/components/lesson/LessonPlayer.tsx'), 'utf8')).toBe('User original code');
});

it('recognizes the CLI entry point through a directory alias such as macOS /tmp', async () => {
  const root = await app();
  const actual = join(root, 'actual');
  await mkdir(actual);
  const file = join(actual, 'updater.mjs');
  await writeFile(file, 'test');
  const alias = join(root, 'alias');
  await symlink(actual, alias, 'dir');
  expect(await isMainModule(join(alias, 'updater.mjs'), pathToFileURL(file).href)).toBe(true);
  expect(await isMainModule(join(root, 'package.json'), pathToFileURL(file).href)).toBe(false);
  expect(await isMainModule(undefined, pathToFileURL(file).href)).toBe(false);
});
