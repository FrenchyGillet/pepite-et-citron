import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * package.json has "type": "module", so Vercel runs the functions as native
 * ES modules: a relative import without its extension ('./_lib/auth') makes
 * the function crash at load time (ERR_MODULE_NOT_FOUND → the client gets
 * FUNCTION_INVOCATION_FAILED). Vitest and tsc resolve such imports anyway,
 * so only this check catches it. That broke payments, push, emails and
 * unsubscribe in production between 2026-09-08 and 2026-09-11.
 */
const API_DIR = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('serverless functions (native ESM on Vercel)', () => {
  it('every relative import ends with .js', () => {
    const offenders = sourceFiles(API_DIR).flatMap(file =>
      [...readFileSync(file, 'utf8').matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
        .map(m => m[1])
        .filter(spec => !spec.endsWith('.js'))
        .map(spec => `${file.slice(API_DIR.length + 1)} → '${spec}'`),
    );
    expect(offenders).toEqual([]);
  });
});
