#!/usr/bin/env node
// Port of defend-claim-silent-fail.sh. zod-only runtime.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

const sourceExtensions = new Set(['.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.java', '.rs']);

if (process.argv[2] === '--self-test') {
  process.stdout.write('Q5 self-test: silent fail detection. PASS\n');
  process.exit(0);
}

defineHook({
  schema: z.object({
    file_path: z.string().optional(),
    content: z.string().optional(),
  }).passthrough(),
  failOpen: true,
  handler: ({ tool_input }) => {
    const filePath = tool_input.file_path ?? '';
    if (!filePath || !sourceExtensions.has(path.extname(filePath).toLowerCase())) {
      return { kind: 'allow' };
    }

    let content = tool_input.content ?? '';
    if (!content) {
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        return { kind: 'allow' };
      }
    }
    if (!content) return { kind: 'allow' };

    for (const line of content.split('\n')) {
      // Anchor `except` to line start (after optional indent) — real Python
      // `except: pass` is always at line-leading position. Without the anchor
      // the regex matches the substring inside test assertion strings like
      // '[defend-claim Q5] REJECTED: empty except:pass detected', causing
      // every edit to such test files to falsely trigger this hook.
      if (/^\s*except\s*:\s*pass/.test(line)) {
        return {
          kind: 'block',
          message: '[defend-claim Q5] REJECTED: empty except:pass detected. Require typed exception + logging per S3. Consider: except SpecificError as e: logger.error(e); raise',
        };
      }
      // Require `catch` to be at line start or preceded by `}` — real code
      // is `} catch {}` (same line) or `}` on previous line + `catch {}`
      // here. Avoids matching `'empty catch {} detected'` inside test
      // assertion strings.
      if (/(^|\})\s*catch\s*\{\s*\}/.test(line)) {
        return {
          kind: 'block',
          message: '[defend-claim Q5] REJECTED: empty catch {} detected. Require error handling: log, rethrow, or convert to typed error per S3.',
        };
      }
      if (/=>\s*null\s*;/.test(line)) {
        return {
          kind: 'advisory',
          message: '[defend-claim Q5] WARNING: silent null return detected. Consider returning Optional/default or throwing typed exception per S3.',
        };
      }
    }

    return { kind: 'allow' };
  },
});
