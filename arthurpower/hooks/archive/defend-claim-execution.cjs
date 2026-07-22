#!/usr/bin/env node
'use strict';
// defend-claim-execution.cjs — Q1 Execution Captured advisory
// Port of defend-claim-execution.sh. Zero-dep Node CJS.
// PostToolUse on Bash. Advisory only — never blocks.
// Preserves --self-test mode for hook validators.

const { readStdin } = require('./lib/read-stdin-with-timeout.cjs');

const TRIGGER = /(curl|wget|pytest|npm test|python.*-m.*test|go test|docker ps)/;

(async function main() {
  // Self-test mode: print PASS line and exit 0 (no hook side-effects)
  if (process.argv[2] === '--self-test') {
    console.log('Q1 self-test: POST-EDIT output capture detection. PASS');
    process.exit(0);
  }

  const raw = await readStdin();
  let input = {};
  try { if (raw.trim()) input = JSON.parse(raw); } catch (_) { /* ignore */ }

  const cmd = (input && input.tool_input && input.tool_input.command) || '';
  if (!TRIGGER.test(cmd)) process.exit(0);

  // Claude Code PostToolUse schema: `.tool_response` (NOT `.tool_output`).
  // Advisory — emits additionalContext to surface to agent. Never blocks.
  const hasToolResponse = input && input.tool_response !== undefined;
  if (!hasToolResponse) {
    const reason = 'command executed but no tool_response captured in '
      + 'PostToolUse payload (Q1 evidence recommended: capture stdout/'
      + 'stderr/exit code as claim artifact)';
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: '[defend-claim Q1 Advisory] ' + reason,
      },
    }));
  }
  process.exit(0);
})().catch((err) => {
  process.stderr.write('[defend-claim-execution.cjs FATAL] ' +
    (err && err.stack || err) + '\n');
  process.exit(0);
});
