// Run from the existing Mikey-main folder with Node 22+.
// Downloads are pinned to a tested revision and verified before local edits.
import { readFile, writeFile, mkdir, rename, rm, copyFile, lstat, realpath, open } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const revision = '3af8b6656d982204cc9dd4428fcd77825e98e13b';
export const files = [
  {
    "path": "src/components/lesson/LessonPlayer.tsx",
    "sha256": "7dc3fac370100a67a58a8ba68a43aae377423453f58cafcf615af7be358df514"
  },
  {
    "path": "src/components/lesson/PracticeStudio.tsx",
    "sha256": "32b3ee8f7dc519fd1d62ee5e8ad7c060de7381a03fc203469426168cf7e3487b"
  },
  {
    "path": "src/components/lesson/usePracticeSpeech.ts",
    "sha256": "ddb6b606f85fea05ce1519df23177886f91ac84b1446963b3a87884bd6dff6f1"
  },
  {
    "path": "src/data/practicePacks.json",
    "sha256": "ed4be30252b2a0b62a3102fe172062b9a85cf770119dd70fbd8f862fee08197a"
  },
  {
    "path": "src/lib/practice.ts",
    "sha256": "f129eff4eef707b0a0bfe4b70add880eac13087c0947a43cd6f02c855b5d39af"
  },
  {
    "path": "vite.config.ts",
    "sha256": "30e14152485d385665813e784558acb09655956437c0fa6f5210dc10ee52fa15"
  },
  {
    "path": "server/practiceAudio.ts",
    "sha256": "3f70d421b1f626e56367f39106642821df41742a5eaefbdec122773a35631338"
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

export async function isMainModule(argument, moduleUrl) {
  if (!argument) return false;
  try {
    // macOS /tmp is an alias of /private/tmp. Node resolves the module's path,
    // while argv can retain the alias used to launch it.
    return await realpath(resolve(argument)) === await realpath(fileURLToPath(moduleUrl));
  } catch { return false; }
}

if (await isMainModule(process.argv[1], import.meta.url)) {
  updatePractice(process.cwd()).then(result => {
    console.log(`Đã cập nhật ${result.updated} file. Bản cũ được giữ tại: ${result.backup}`);
    console.log('Chạy npm run dev, rồi tải lại trang. Bản sửa âm thanh này không cần chạy SQL.');
  }).catch(error => { console.error('Chưa cập nhật được:', error.message); process.exitCode = 1; });
}
