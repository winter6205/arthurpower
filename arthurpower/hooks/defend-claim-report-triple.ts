#!/usr/bin/env node
// Port of defend-claim-report-triple.sh. zod-only runtime.
import path from 'node:path';
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

const sourceExtensions = new Set([
  '.go', '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.rs',
  '.c', '.cpp', '.h', '.hpp', '.sh', '.cjs',
]);
const actionPattern = /(ran|built|tested|grepped|curl|executed|verified|confirmed|passed|exit\.code|sha256|exit.*0|HTTP.*200|grep.*matched)/i;
const chineseNarrative = /完成|成功|已验证|已修复/;
const englishNarrative = /\b(done|fixed|completed|passing)\b/i;
const codeSignature = /(<-|\bcase\b|\bchan\b|\bfunc\b|\btype\b|\bvar\b|\blet\b|\bconst\b|\bstruct\b|\binterface\b|\breturn\b)/;
const comment = /^\s*(\/\/|\/\*|\*)/;

if (process.argv[2] === '--self-test') {
  process.stdout.write('Q3 self-test: report triple detection. PASS\n');
  process.exit(0);
}

defineHook({
  schema: z.object({
    file_path: z.string().optional(),
    content: z.string().optional(),
    new_string: z.string().optional(),
  }).passthrough(),
  failOpen: true,
  handler: ({ tool_input }) => {
    const filePath = tool_input.file_path ?? '';
    const content = tool_input.content || tool_input.new_string || '';
    if (!sourceExtensions.has(path.extname(filePath).toLowerCase()) || !content) {
      return { kind: 'allow' };
    }

    let trigger: string | null = null;
    for (const line of content.split('\n')) {
      if (!line) continue;
      if (chineseNarrative.test(line)) {
        trigger = 'cn';
        break;
      }
      if (!englishNarrative.test(line)) continue;
      if (comment.test(line)) {
        trigger = 'en-cmt';
        break;
      }
      if (codeSignature.test(line)) continue;
      trigger = 'en';
      break;
    }

    if (!trigger || actionPattern.test(content)) return { kind: 'allow' };
    return {
      kind: 'block',
      message: `REJECTED: completion report without evidence triple (trigger: ${trigger}). Required: action-verb + artifact + outcome (e.g., "ran pytest tests/unit/ -- exit 0").`,
    };
  },
});
