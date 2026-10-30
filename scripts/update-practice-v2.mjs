// Run from the existing Mikey-main folder with Node 22+.
// Downloads are pinned to a tested revision and verified before local edits.
import { readFile, writeFile, mkdir, rename, rm, copyFile, lstat, realpath, open } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const revision = '263e1f4c1a8412279f126d6ac2027d6aef90c1a2';
export const files = [
  {
    "path": "src/components/lesson/LessonPlayer.tsx",
    "sha256": "7dc3fac370100a67a58a8ba68a43aae377423453f58cafcf615af7be358df514"
  },
  {
    "path": "src/components/lesson/PracticeStudio.tsx",
    "sha256": "602626c4b72c10667480b42c68ccd0e254bace6b3f120d447259fc601e09c9e6"
  },
  {
    "path": "src/components/lesson/usePracticeSpeech.ts",
    "sha256": "d58df815d1b9511b1a274aad3664b4bba3816fd0f5516c4b2324b9de7f9a745e"
  },
  {
    "path": "src/data/practicePacks.json",
    "sha256": "ed4be30252b2a0b62a3102fe172062b9a85cf770119dd70fbd8f862fee08197a"
  },
  {
    "path": "src/lib/practice.ts",
    "sha256": "f129eff4eef707b0a0bfe4b70add880eac13087c0947a43cd6f02c855b5d39af"
  }
];

async function rejectSymlinks(root, relativePath) {
  let current = root;
  const segments = relativePath.split('/');
  for (let i = 0; i < segments.length; i++) {
    current = join(current, segments[i]);
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) throw new Error(`Không cập nhật đường dẫn liên kết: ${relativePath}`);
      if (i < segments.length - 1 && !entry.isDirectory()) throw new Error(`Đường dẫn không phải thư mục: ${current}`);
      if (i === segments.length - 1 && !entry.isFile()) throw new Error(`Đích không phải file: ${relativePath}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

export async function updatePractice(directory, fetchFile = fetch) {
  const root = await realpath(directory);
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (!pkg.scripts?.dev?.includes('vite')) throw new Error('Hãy chạy trong thư mục Mikey-main có package.json của web.');
  await readFile(join(root, 'src/components/lesson/LessonPlayer.tsx'));
  const lockPath = join(root, '.mikey-practice-update.lock');
  const lock = await open(lockPath, 'wx');
  const backup = join(root, '.mikey-backups', `practice-v2-${Date.now()}-${randomUUID().slice(0, 8)}`);
  const snapshots = [];
  const changed = [];
  let temporary;
  try {
    const downloads = [];
    for (const file of files) {
      await rejectSymlinks(root, file.path);
      const response = await fetchFile(`https://raw.githubusercontent.com/englishwithmikey-glitch/Mikey/${revision}/${file.path}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Không tải được ${file.path}: HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`Nội dung tải về không khớp checksum: ${file.path}`);
      downloads.push({ ...file, bytes });
    }
    // Capture every existing target before touching any of them.
    for (const file of downloads) {
      const target = join(root, file.path);
      try {
        const entry = await lstat(target);
        await mkdir(dirname(join(backup, file.path)), { recursive: true });
        await copyFile(target, join(backup, file.path));
        snapshots.push({ path: file.path, existed: true, mode: entry.mode });
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        snapshots.push({ path: file.path, existed: false, mode: 0o644 });
      }
    }
    for (const file of downloads) {
      const target = join(root, file.path);
      await rejectSymlinks(root, file.path);
      await mkdir(dirname(target), { recursive: true });
      temporary = `${target}.mikey-${randomUUID()}.tmp`;
      const snapshot = snapshots.find(item => item.path === file.path);
      await writeFile(temporary, file.bytes, { flag: 'wx', mode: snapshot.mode & 0o777 });
      await rename(temporary, target); temporary = undefined;
      changed.push(snapshot);
    }
    return { root, backup, updated: files.length };
  } catch (error) {
    const failures = [];
    for (const snapshot of changed.reverse()) {
      try {
        if (snapshot.existed) await copyFile(join(backup, snapshot.path), join(root, snapshot.path));
        else await rm(join(root, snapshot.path), { force: true });
      } catch { failures.push(snapshot.path); }
    }
    if (failures.length) throw new Error(`${error.message}. Cần khôi phục ${failures.join(', ')} từ ${backup}`);
    throw error;
  } finally {
    if (temporary) await rm(temporary, { force: true });
    await lock.close(); await rm(lockPath, { force: true });
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  updatePractice(process.cwd()).then(result => {
    console.log(`Đã cập nhật ${result.updated} file. Bản cũ được giữ tại: ${result.backup}`);
    console.log('Chạy npm run dev, rồi tải lại trang. Dữ liệu Supabase cần nhập SQL v2 riêng.');
  }).catch(error => { console.error('Chưa cập nhật được:', error.message); process.exitCode = 1; });
}
