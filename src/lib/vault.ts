import fs from "fs";
import path from "path";

const INBOX_PATH = process.env.VAULT_INBOX_PATH!;
const ROOT_PATH = process.env.VAULT_ROOT_PATH!;

export function getInboxFiles(): string[] {
  if (!fs.existsSync(INBOX_PATH)) return [];
  return fs
    .readdirSync(INBOX_PATH)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join("inbox", f));
}

export function readFile(relPath: string): string {
  const fullPath = path.join(ROOT_PATH, relPath);
  return fs.readFileSync(fullPath, "utf-8");
}

export function writeFile(relPath: string, content: string): void {
  const fullPath = path.join(ROOT_PATH, relPath);
  fs.writeFileSync(fullPath, content, "utf-8");
}

export function moveFile(relPath: string, targetRelPath: string): void {
  const src = path.join(ROOT_PATH, relPath);
  const dest = path.join(ROOT_PATH, targetRelPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
}

export function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT_PATH, relPath));
}

export function getFilename(relPath: string): string {
  return path.basename(relPath);
}

export function getAllFolders(): string[] {
  const folders: string[] = [];

  function walk(dir: string, rel: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      const relChild = rel ? `${rel}/${entry.name}` : entry.name;
      folders.push(relChild);
      walk(path.join(dir, entry.name), relChild);
    }
  }

  walk(ROOT_PATH, "");
  return folders;
}
