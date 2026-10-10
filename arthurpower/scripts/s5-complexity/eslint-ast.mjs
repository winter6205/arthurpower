/**
 * ESLint access for the S5 gate: function spans + reports for a source TEXT
 * (not a path), so the ratchet can lint the HEAD version of a file that no
 * longer exists on disk.
 *
 * Both calls take the filename only for parser/config resolution against the
 * basename: ESLint matches flat-config files/ignores globs against path-like
 * names, and absolute paths would not match the `**` / `*` glob form. Line
 * numbers are path-independent, so spans are stamped with the caller's full
 * path while the linter only ever sees the basename.
 *
 * eslint and the S5 ruleset resolve from the PROJECT (the script may run from
 * anywhere), so modules load via createRequire against the project root; the
 * ruleset is the same eslint.config.mjs the CLI path uses, imported once.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** AST selectors whose nodes own a complexity footprint. */
const FUNCTION_VISITOR_KEYS = [
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "TSDeclareFunction",
];

/**
 * The function's name, from wherever the AST keeps it.
 *
 * Declarations and named expressions carry `id`; the common `const foo = () =>`
 * and `{ foo() {} }` / `foo() {}` forms carry it on the parent. Anonymous
 * callbacks have none, and that null is used to skip name-based pairing.
 *
 * @param {any} node
 * @returns {string|null}
 */
function functionName(node) {
  if (typeof node.id?.name === "string") return node.id.name;
  const parent = node.parent;
  if (parent?.type === "VariableDeclarator" && typeof parent.id?.name === "string") {
    return parent.id.name;
  }
  if (
    (parent?.type === "Property" || parent?.type === "MethodDefinition") &&
    typeof parent.key?.name === "string"
  ) {
    return parent.key.name;
  }
  return null;
}

/** Extensions the S5 config applies to (kept in sync with eslint.config.mjs). */
const AUDITED_FILES = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.js",
  "**/*.jsx",
  "**/*.mjs",
  "**/*.cjs",
];

/**
 * Build the AST visitor that records one span per function node.
 *
 * @param {string} filename repo-relative path to stamp onto the spans
 * @param {Array<{file: string, selector: string, name: string|null, startLine: number, endLine: number}>} out
 * @returns {Record<string, (node: any) => void>}
 */
function spanVisitor(filename, out) {
  const visitor = {};
  for (const key of FUNCTION_VISITOR_KEYS) {
    visitor[key] = (node) => {
      const start = node.loc?.start?.line;
      const end = node.loc?.end?.line;
      if (typeof start !== "number" || typeof end !== "number") return;
      out.push({
        file: filename,
        selector: key,
        name: functionName(node),
        startLine: start,
        endLine: end,
      });
    };
  }
  return visitor;
}

/**
 * Create the span extractor + linter bound to a project root.
 *
 * Async because the S5 ruleset is an ESM module imported at runtime (after the
 * caller has validated cwd, which the ruleset reads for module resolution).
 *
 * @param {string} projectRoot directory containing node_modules/eslint
 * @returns {Promise<{
 *   spans: (filename: string, text: string) => Array<{file: string, selector: string, name: string|null, startLine: number, endLine: number}>,
 *   lint: (filename: string, text: string) => {ignored: boolean, reports: Array<{severity: number, line: number, ruleId: string|null, message: string}>}
 * }>}
 */
export async function createEslintTools(projectRoot) {
  const require = createRequire(`${projectRoot.replace(/\/$/, "")}/package.json`);
  const { Linter } = require("eslint");
  // TS files need the typescript-eslint parser; plain JS parses either way.
  let tsParser = null;
  try {
    tsParser = require("typescript-eslint").parser;
  } catch {
    tsParser = null; // JS-only project → default espree path still works
  }
  const ruleset = (
    await import(
      pathToFileURL(
        join(dirname(fileURLToPath(import.meta.url)), "eslint.config.mjs"),
      ).href
    )
  ).default;

  const linter = new Linter({ configType: "flat" });
  const languageOptions =
    tsParser !== null
      ? { parser: tsParser, sourceType: "module" }
      : { sourceType: "module" };

  /**
   * Basename the linter sees. ESLint's flat-config matching treats the
   * filename as path-like; line numbers do not depend on it.
   * @param {string} filename
   */
  const lintName = (filename) => filename.split(/[\\/]/).pop() ?? "file.ts";

  return {
    /**
     * Function spans in `text`. An extraction-only config (noop visitor rule)
     * so span discovery cannot depend on thresholds being enabled.
     */
    spans(filename, text) {
      /** @type {Array<{file: string, selector: string, name: string|null, startLine: number, endLine: number}>} */
      const out = [];
      const config = [
        {
          files: AUDITED_FILES,
          languageOptions,
          plugins: {
            "s5-collect": {
              rules: { noop: { create: () => spanVisitor(filename, out) } },
            },
          },
          rules: { "s5-collect/noop": "error" },
        },
      ];
      try {
        linter.verify(text, config, lintName(filename));
      } catch {
        // Parse failure (generated / non-JS content) → no spans; a file with no
        // spans cannot be charged to any function, so callers skip it.
        return [];
      }
      return out;
    },

    /**
     * S5 ruleset over `text`. `ignored` marks files the ruleset excludes
     * (tests, specs) — ESLint signals that with a line-0, null-rule message
     * rather than an error, and callers must not ratchet such files.
     */
    lint(filename, text) {
      let messages;
      try {
        messages = linter.verify(text, ruleset, lintName(filename));
      } catch {
        return { ignored: true, reports: [] };
      }
      if (
        messages.length === 1 &&
        messages[0].ruleId === null &&
        messages[0].line === 0
      ) {
        return { ignored: true, reports: [] };
      }
      return {
        ignored: false,
        reports: messages.map((m) => ({
          severity: m.severity,
          line: m.line,
          ruleId: m.ruleId,
          message: m.message,
        })),
      };
    },
  };
}
