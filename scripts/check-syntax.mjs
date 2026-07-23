import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
async function collectJavaScript(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const entryPath = resolve(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScript(entryPath);
    return entry.name.endsWith('.js') ? [entryPath] : [];
  }));
  return nested.flat();
}

const sourceFiles = await collectJavaScript(resolve(root, 'js'));
sourceFiles.push(resolve(root, 'dev-server.cjs'));

for (const file of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax check passed for ${sourceFiles.length} JavaScript files.`);
