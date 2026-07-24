// Driver-level tests for pre-context-write-guard.ts (gh-68: ADR edit-mode leniency).
// Protocol: spawn the hook with a PreToolUse envelope on stdin; assert exit code
// (0=allow, 2=block) + stderr BLOCKED message.
// Isolation: CLAUDE_CONFIG_DIR → per-suite mkdtempSync tmpdir so readActiveSkill()
// finds no routing-state → identity check fails open (identityCheckDisabled = true).
// Structural validation (validateAdr / validateAdrFragment) is the only layer under
// test here; identity enforcement is out of scope for this suite.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOOK = path.resolve(import.meta.dirname, '..', 'pre-context-write-guard.ts');
const ADR_PATH = 'docs/adr/0002-foo.md';
let cfgDir: string;

before(() => { cfgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-test-')); });
after(() => { fs.rmSync(cfgDir, { recursive: true, force: true }); });

function runHook(envelope: unknown): { status: number; stderr: string } {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', HOOK], {
    input: JSON.stringify(envelope),
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
    encoding: 'utf8',
    timeout: 10000,
  });
  return { status: r.status ?? -1, stderr: r.stderr };
}

// Extract the BLOCKED systemMessage from stderr (skip non-JSON [guard] hint lines).
function blockedMessage(stderr: string): string {
  for (const line of stderr.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as { systemMessage?: unknown };
      if (typeof obj.systemMessage === 'string' && obj.systemMessage.startsWith('BLOCKED: ')) return obj.systemMessage;
    } catch { /* non-JSON line */ }
  }
  return '';
}

const edit = (newString: string, filePath: string = ADR_PATH) => ({
  tool_name: 'Edit',
  tool_input: { file_path: filePath, old_string: 'x', new_string: newString },
});
const write = (content: string, filePath: string = ADR_PATH) => ({
  tool_name: 'Write',
  tool_input: { file_path: filePath, content },
});
const VALID_ADR = '# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n';

// ----------------------------------------------------------------------------
// Bug repro + edit-mode positive (the fix's core)
// ----------------------------------------------------------------------------

test('Edit fragment Status: accepted on existing ADR → allow', () => {
  const r = runHook(edit('Status: accepted'));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('Edit multi-line fragment with valid Date + Status → allow', () => {
  const r = runHook(edit('Date: 2026-07-24\nStatus: accepted'));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('Edit prose-only fragment → allow', () => {
  const r = runHook(edit('Just adding a note here.'));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('MultiEdit two valid fragments → allow', () => {
  const r = runHook({
    tool_name: 'MultiEdit',
    tool_input: {
      file_path: ADR_PATH,
      edits: [
        { old_string: 'a', new_string: 'Status: accepted' },
        { old_string: 'b', new_string: '## Notes\nextra context' },
      ],
    },
  });
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

// ----------------------------------------------------------------------------
// Edit-mode fragment enforcement (negative)
// ----------------------------------------------------------------------------

test('Edit fragment with invalid Status enum → block', () => {
  const r = runHook(edit('Status: banana'));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('Status 不在'),
    'expected Status-enum block, got: ' + r.stderr);
});

test('Edit fragment with invalid Date format → block', () => {
  const r = runHook(edit('Date: 24-07-2026'));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('Date: YYYY-MM-DD'),
    'expected Date-format block, got: ' + r.stderr);
});

// ----------------------------------------------------------------------------
// Write-path regression (must stay intact)
// ----------------------------------------------------------------------------

test('Write valid single-paragraph ADR → allow', () => {
  const r = runHook(write(VALID_ADR));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('Write valid multi-section ADR → allow', () => {
  const body = '# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n\n## Context\n\nstuff.\n\n## Decision\n\nstuff.\n\n## Consequences\n\nstuff.\n';
  const r = runHook(write(body));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('Write missing NNNN. title prefix → block', () => {
  const r = runHook(write('# Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n'));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('标题行缺少 NNNN'),
    'expected title-prefix block, got: ' + r.stderr);
});

test('Write wrong number prefix (3 vs file 0002) → block', () => {
  const r = runHook(write('# 3. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n'));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('标题行缺少 NNNN'),
    'expected title-prefix block, got: ' + r.stderr);
});

test('Write invalid Status enum → block', () => {
  const r = runHook(write('# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: banana\n'));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('Status 不在'),
    'expected Status-enum block, got: ' + r.stderr);
});

test('Write partial multi-section (Context only) → block', () => {
  const body = '# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: accepted\n\n## Context\n\nstuff.\n';
  const r = runHook(write(body));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('## Decision'),
    'expected Decision-missing block, got: ' + r.stderr);
});

test('Write superseded by NNNN status → allow', () => {
  const r = runHook(write('# 0002. Foo\n\nDate: 2026-07-24\n\nStatus: superseded by 0017\n'));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

// ----------------------------------------------------------------------------
// Empty boundary
// ----------------------------------------------------------------------------

test('Write empty content → block', () => {
  const r = runHook(write(''));
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('写入内容为空'),
    'expected empty-write block, got: ' + r.stderr);
});

test('Edit empty new_string → block', () => {
  const r = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: ADR_PATH, old_string: 'x', new_string: '' },
  });
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('写入内容为空'),
    'expected empty-write block, got: ' + r.stderr);
});

// ----------------------------------------------------------------------------
// Non-guarded path
// ----------------------------------------------------------------------------

test('Write to non-ADR path → allow', () => {
  const r = runHook(write('anything at all', 'docs/notes.md'));
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

// ----------------------------------------------------------------------------
// Overflow boundary
// ----------------------------------------------------------------------------

test('Edit 100KB fragment of valid Status lines → allow under 2s', () => {
  const fragment = 'Status: proposed\n'.repeat(6200);
  assert.ok(fragment.length > 100 * 1024, 'precondition: fragment > 100KB');
  const t0 = Date.now();
  const r = runHook(edit(fragment));
  const elapsed = Date.now() - t0;
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
  assert.ok(elapsed < 2000, 'elapsed ' + elapsed + 'ms exceeds 2s budget');
});

// ----------------------------------------------------------------------------
// Concurrent boundary
// ----------------------------------------------------------------------------

test('5 parallel Edit fragments, shared config dir → all allow', async () => {
  const envelope = edit('Status: accepted');
  const children = Array.from({ length: 5 }, () =>
    spawn(process.execPath, ['--experimental-strip-types', HOOK], {
      env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
    })
  );
  for (const c of children) {
    c.stdin.end(JSON.stringify(envelope));
  }
  const codes = await Promise.all(children.map((c) => new Promise<number>((resolve) => {
    c.on('close', (code) => resolve(code ?? -1));
  })));
  assert.deepEqual(codes, [0, 0, 0, 0, 0]);
});

// ----------------------------------------------------------------------------
// Exception boundary
// ----------------------------------------------------------------------------

test('content/new_string/edits all null → empty-write block', () => {
  const r = runHook({
    tool_name: 'Edit',
    tool_input: { file_path: ADR_PATH, content: null, new_string: null, edits: null },
  });
  assert.equal(r.status, 2, 'status was ' + r.status);
  assert.ok(blockedMessage(r.stderr).includes('写入内容为空'),
    'expected empty-write block, got: ' + r.stderr);
});

test('non-JSON stdin → fail-open exit 0', () => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', HOOK], {
    input: 'this is not json',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgDir },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(r.status ?? -1, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});

test('edits array with non-string new_string coerced to empty → allow', () => {
  const r = runHook({
    tool_name: 'MultiEdit',
    tool_input: {
      file_path: ADR_PATH,
      edits: [
        { old_string: 'a', new_string: 'Status: accepted' },
        { old_string: 'b', new_string: 42 },
      ],
    },
  });
  assert.equal(r.status, 0, 'status was ' + r.status + ' stderr=' + r.stderr);
});