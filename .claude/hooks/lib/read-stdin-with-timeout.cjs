// Read a JSON payload from stdin with a 1s grace timeout.
//
// Why: The Claude Code hook runner writes the JSON payload to the child
// process's stdin but does NOT always call stdin.end() (verified by
// reproducing the hang in pre-context-write-guard.cjs). The standard
// `for await (const c of process.stdin)` and `on('end')` patterns both
// block indefinitely waiting for EOF. The hook then hangs until the
// harness kills it, producing a "No stderr output" error that fails the
// tool even though the hook was designed to be fail-open.
//
// Fix: accumulate via on('data'), and after 1s of silence (no new
// chunks), resolve with whatever was accumulated. The 1s window is
// generous enough for normal hook payloads (typically < 10 KB) and
// short enough that no user-visible latency is added to tool calls.
// All exit paths leave the underlying stdin behavior unchanged.

const READ_STDIN_TIMEOUT_MS = 1000;

function readStdin() {
  return new Promise((resolve) => {
    let buf = '';
    let settled = false;
    let timer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(buf);
    };
    try {
      process.stdin.setEncoding('utf8');
    } catch (_) {
      finish();
      return;
    }
    process.stdin.on('data', (c) => {
      buf += c;
      // Sliding-window: reset the timer on every chunk so a slow stream
      // (large payload) gets the full 1s grace after the last byte.
      if (timer) clearTimeout(timer);
      timer = setTimeout(finish, READ_STDIN_TIMEOUT_MS);
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
    // Initial timer in case the runner never writes anything at all
    // (empty payload is a valid "nothing to do" case).
    timer = setTimeout(finish, READ_STDIN_TIMEOUT_MS);
  });
}

module.exports = { readStdin, READ_STDIN_TIMEOUT_MS };
