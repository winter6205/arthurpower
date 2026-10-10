#!/usr/bin/env node
// Port of defend-claim-execution.sh. zero-dep runtime.
// Advisory shape: hookSpecificOutput.additionalContext (stdout + exit 0) so the
// MODEL sees the Q1 reminder and can act on it. systemMessage (stderr) would
// only reach the user UI — wrong channel for a "go capture evidence" nudge.
import { z } from './runtime/tiny-schema.ts';
import { defineHook } from './runtime/defineHook.ts';

const trigger = /(curl|wget|pytest|npm test|python.*-m.*test|go test|docker ps)/;

if (process.argv[2] === '--self-test') {
  process.stdout.write('Q1 self-test: POST-EDIT output capture detection. PASS\n');
  process.exit(0);
}

defineHook({
  schema: z.object({
    command: z.string().optional(),
  }).passthrough(),
  failOpen: true,
  handler: ({ tool_input, tool_response }) => {
    if (!trigger.test(tool_input.command ?? '') || tool_response !== undefined) {
      return { kind: 'allow' };
    }

    // Write advisory to stdout as additionalContext (injected into model context).
    // Cannot use defineHook's exitAdvisory (writes systemMessage to stderr — user-only).
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: '[defend-claim Q1 Advisory] command executed but no tool_response captured in PostToolUse payload (Q1 evidence recommended: capture stdout/stderr/exit code as claim artifact)',
      },
    }));
    return { kind: 'allow' };
  },
});
