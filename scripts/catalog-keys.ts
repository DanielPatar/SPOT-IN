/**
 * Lists every message key referenced in src/ (static keys, plus client components'
 * useTranslations namespaces). Used by the catalog test (FR-M25-05).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

export function referencedKeys(root = "src"): { keys: Set<string>; dynamic: Set<string> } {
  const keys = new Set<string>();
  const dynamic = new Set<string>();
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    const ns = /useTranslations\("([\w.]+)"\)/.exec(src)?.[1];
    for (const m of src.matchAll(/\bt\("([\w.]+)"/g)) keys.add(ns && !m[1]!.includes(".") ? `${ns}.${m[1]}` : ns ? `${ns}.${m[1]}` : m[1]!);
    for (const m of src.matchAll(/\bt\(`([\w.]+)\.\$\{/g)) dynamic.add(ns ? `${ns}.${m[1]}` : m[1]!);
    for (const m of src.matchAll(/new AppError\("([\w.]+)"/g)) keys.add(m[1]!);
    for (const m of src.matchAll(/AppError\(\s*[^)]*\?\s*"([\w.]+)"\s*:\s*"([\w.]+)"/g)) {
      keys.add(m[1]!);
      keys.add(m[2]!);
    }
  }
  return { keys, dynamic };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { keys, dynamic } = referencedKeys();
  const msgs = JSON.parse(readFileSync("messages/id.json", "utf8"));
  const has = (k: string) => k.split(".").reduce<unknown>((o, p) => (o && typeof o === "object" ? (o as Record<string, unknown>)[p] : undefined), msgs) !== undefined;
  const missing = [...keys].filter((k) => !has(k)).sort();
  console.log(JSON.stringify({ missing, dynamic: [...dynamic].sort() }, null, 1));
}
