#!/usr/bin/env node
// pre-tool-guard.ts — PreToolUse Bash guard. Port of pre-tool-guard.sh.
//
// settings.json `permissions.deny` is the single source of truth for the
// high-frequency dangerous patterns (git push --force, reset --hard, rm -rf,
// secret reads). This hook adds only what a deny-list rule cannot express:
//   1. Anti-tampering: block write-class mutations (rm / mv / chmod /
//      sed -i / perl -pi) against hook & gate configs — .claude/hooks,
//      .git/hooks, .husky, pre-commit, lint-staged. Pure read/exec commands
//      (cat, bash -n, …) are excluded by requiring a write-class verb.
//   2. rm -rf external-temp allowlist: when ALL rm -rf targets are external
//      temp paths (/tmp, /var/tmp, $TMPDIR, $TEMP), explicitly allow — the
//      legitimate "clean /tmp" workflow. NOTE: preserved verbatim from the
//      .sh, where both branches exit 0, so this is advisory parity rather
//      than a real override of the settings.json `Bash(rm -rf:*)` deny.
//
// Output contract (runtime/exit.ts): deny -> permissionDecision:deny on
// STDERR + exit 2; allow -> exit 0 silently. Fail-open on bad stdin — never
// block a legitimate call on a hook bug.
// Override: ARTHUR_TOOL_GUARD_ALLOW=1 bypasses (mirrors ARTHUR_FS_GUARD_ALLOW
// in pre-fs-guard.ts and ARTHUR_PIP_ALLOW in pre-tool-supply-chain.ts).
import { z } from 'zod';
import { defineHook } from './runtime/defineHook.ts';

const OVERRIDE_ENV = 'ARTHUR_TOOL_GUARD_ALLOW';

// Hook / gate config paths protected from write-class mutation.
const HOOK_PATHS = String.raw`(?:\.git/hooks|\.husky|pre-commit|lint-staged|\.claude/hooks)`;

// Anchored, independent — never join into one mega-regex (sibling convention).
// R1: write-class verb (rm/mv/chmod) whose target span reaches a hook path.
const R_WRITE_VERB = new RegExp(String.raw`(^|[^a-z])(rm|mv|chmod)\s+[^;|&]*${HOOK_PATHS}`);
// R2: in-place edit (sed -i / perl -pi) reaching a hook path.
const R_INPLACE_EDIT = new RegExp(String.raw`(?:sed\s+-i|perl\s+-pi)[^;|&]*${HOOK_PATHS}`);
// R3: recursive rm/mv/chmod reaching a hook path. Kept verbatim from the
// .sh for parity/grep-ability, though unreachable here — R_WRITE_VERB (R1)
// matches every input R3 would, and check() short-circuits on R1 first.
const R_RECURSIVE = new RegExp(String.raw`(rm|mv|chmod).*-r[^;|&]*${HOOK_PATHS}`);
// R4: rm -rf / -fr detection (r+f in either flag order).
const R_RM_RF = /rm\s+(?:-[A-Za-z0-9]*r[A-Za-z0-9]*f|-[A-Za-z0-9]*f[A-Za-z0-9]*r)/;

// Collapse every whitespace run (incl. newlines) to a single space — mirrors
// the .sh's `tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g'`.
function normalize(cmd: string): string {
  return cmd.replace(/\s+/g, ' ');
}

// True only when EVERY rm -rf target is an external temp path. Mirrors the
// .sh's per-target case match on /tmp/*, /var/tmp/*, $TMPDIR/*, $TEMP/*.
function allTargetsExternal(normalized: string): boolean {
  const tmpdirDefault = process.env.TMPDIR || '/tmp';
  const tempDefault = process.env.TEMP || process.env.TMP || tmpdirDefault;
  const targets = normalized
    .replace(/.*rm\s+-[A-Za-z]*[rR][A-Za-z]*[fF][A-Za-z]*\s+/, '')
    .replace(/[;|&].*/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (targets.length === 0) return false;
  const externalPrefixes = ['/tmp/', '/var/tmp/', `${tmpdirDefault}/`, `${tempDefault}/`];
  return targets.every((raw) => {
    const t = raw.replace(/\/+$/, '');
    return externalPrefixes.some((p) => t.startsWith(p));
  });
}

// Returns the reason for the first rule that matches, or null when the
// command is clean. A reason string (not a boolean) is returned so the
// handler can feed it straight into the deny message.
function check(normalized: string): string | null {
  if (R_WRITE_VERB.test(normalized)) {
    return 'removing/moving/chmod-ing hook paths is blocked.';
  }
  if (R_INPLACE_EDIT.test(normalized)) {
    return 'in-place editing hook paths is blocked.';
  }
  if (R_RECURSIVE.test(normalized)) {
    return 'recursive rm/mv/chmod on hook paths is blocked.';
  }
  return null;
}

defineHook({
  schema: z.object({ command: z.string().optional() }).passthrough(),
  failOpen: true,
  handler: ({ tool_input }) => {
    if (process.env[OVERRIDE_ENV] === '1') return { kind: 'allow' };

    const cmd = typeof tool_input.command === 'string' ? tool_input.command : '';
    if (!cmd) return { kind: 'allow' };

    const normalized = normalize(cmd);

    const reason = check(normalized);
    if (reason) {
      return {
        kind: 'deny',
        message: 'BLOCKED: pre-tool-guard — ' + reason
          + ' Override: export ' + OVERRIDE_ENV + '=1',
      };
    }

    // rm -rf external-temp allowlist — preserved verbatim from the .sh for
    // parity. In the .sh this branch mattered because a separate settings.json
    // `Bash(rm -rf:*)` deny layer existed and the hook's allow was meant to
    // override it; a hook cannot override settings.json permissions, so in the
    // TS runtime both arms are `allow` and this is a documented no-op. Kept so
    // the structure stays diff-able against the .sh.
    if (R_RM_RF.test(normalized) && allTargetsExternal(normalized)) {
      return { kind: 'allow' };
    }

    return { kind: 'allow' };
  },
});
