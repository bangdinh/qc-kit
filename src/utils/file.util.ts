import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8')) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(path.resolve(filePath)));
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2), 'utf-8');
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(path.resolve(filePath));
}
