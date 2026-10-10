const CODE_RE = /\.(tsx?|jsx?|mjs|cjs)$/i;

export function parseArgs(argv) {
  let changed = false;
  let staged = false;
  let base = null;
  const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--changed") {
      changed = true;
      continue;
    }
    if (a === "--staged") {
      staged = true;
      continue;
    }
    if (a === "--base") {
      base = argv[++i];
      if (!base || base.startsWith("-")) {
        throw new Error("s5-complexity: --base needs a git ref");
      }
      continue;
    }
    if (a.startsWith("-")) {
      throw new Error(`s5-complexity: unknown flag ${a}`);
    }
    paths.push(a);
  }
  if (staged && !changed) {
    throw new Error("s5-complexity: --staged requires --changed");
  }
  if (base && !changed) {
    throw new Error("s5-complexity: --base requires --changed");
  }
  return { changed, staged, base, paths };
}

export function listChangedFromGit({ staged, base, run }) {
  const names = [];
  if (staged) {
    names.push(...splitNames(run(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])));
    return names;
  }
  if (base) {
    names.push(...splitNames(run(["diff", "--name-only", "--diff-filter=ACMR", base])));
    return names;
  }
  names.push(...splitNames(run(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"])));
  names.push(...splitNames(run(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])));
  names.push(...splitNames(run(["ls-files", "--others", "--exclude-standard"])));
  return names;
}

export function resolveTargets({ argv, listChanged, exists }) {
  const { changed, staged, base, paths } = parseArgs(argv);
  if (changed && paths.length > 0) {
    throw new Error("s5-complexity: --changed does not take paths");
  }
  if (!changed) {
    return {
      changed: false,
      staged: false,
      base: null,
      paths: paths.length > 0 ? paths : ["src"],
      emptyChanged: false,
    };
  }
  const kept = [];
  const seen = new Set();
  for (const raw of listChanged({ staged, base })) {
    const n = raw.replaceAll("\\", "/");
    if (seen.has(n) || !CODE_RE.test(n) || !exists(n)) continue;
    seen.add(n);
    kept.push(n);
  }
  return { changed: true, staged, base, paths: kept, emptyChanged: kept.length === 0 };
}

function splitNames(stdout) {
  return String(stdout ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}
