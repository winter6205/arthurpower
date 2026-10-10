#!/usr/bin/env node
// Port of defend-claim-cite-integrity.sh. zero-dep runtime.
import fs from 'node:fs';
import path from 'node:path';
import { z } from './runtime/tiny-schema.ts';
import { defineHook } from './runtime/defineHook.ts';

const schema = z.object({
  content: z.string().optional(),
  file_path: z.string().optional(),
}).passthrough();

function isDigits(value: string): boolean {
  if (value.length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

function tryResolve(filePath: string, cwd: string): string | null {
  const candidates = [filePath, path.resolve(cwd, filePath)];
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // Try the next candidate. Missing citations are handled by the caller.
    }
  }
  return null;
}

function lineExists(filePath: string, lineNumber: number): boolean {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    let currentLine = 1;
    for (let index = 0; index < data.length; index += 1) {
      if (currentLine === lineNumber) return true;
      if (data.charCodeAt(index) === 10) currentLine += 1;
    }
    return currentLine === lineNumber;
  } catch {
    return false;
  }
}

defineHook({
  schema,
  failOpen: true,
  handler: ({ tool_input }) => {
    const content = tool_input.content ?? '';
    const editedFile = tool_input.file_path ?? '';
    const cwd = editedFile ? path.dirname(editedFile) : process.cwd();

    if (!content) return { kind: 'allow' };

    for (const line of content.split('\n')) {
      const colon = line.lastIndexOf(':');
      if (colon <= 0) continue;

      const citedPath = line.substring(0, colon);
      const citedLine = line.substring(colon + 1).trim();
      if (!isDigits(citedLine)) continue;
      if (!citedPath.includes('/') && !citedPath.includes(':')) continue;
      if (citedPath.startsWith('//') || citedPath.startsWith('http')) continue;

      const resolved = tryResolve(citedPath, cwd);
      if (!resolved) {
        return {
          kind: 'block',
          message: `REJECTED: Q2 phantom cite - file does not exist: ${citedPath} (cwd: ${cwd})`,
        };
      }
      if (!lineExists(resolved, Number.parseInt(citedLine, 10))) {
        return {
          kind: 'block',
          message: `REJECTED: Q2 phantom cite - line ${citedLine} does not exist in ${resolved}`,
        };
      }
    }

    return { kind: 'allow' };
  },
});
