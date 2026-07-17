# Strip checklist + layer routing

## Strip before write (Step 3)

Strip is enforced by the genericization rule (`no-meta-specific`). Do not restate its banned lexemes here.

Before any write, run the rule's grep suite (or `scripts/validate_skill.py` private-prefix checks when the target is a skill) and require zero hits outside that rule's necessary exemptions.

Categories to strip (placeholders only; real forms live in the validator):

| Category | Placeholder form |
|----------|------------------|
| Compound private-prefix | `${COMPOUND_LEXEMES}` |
| Single-char private reference | `${SAY_VERBS}` with private prefix |
| Private path references | home-config L1 paths written as bare `~/...` without the project `@import` form |
| Private date clauses | `${DATE_CLAUSES}` |
| Self-certifying authority labels | `${AUTHORITY_LABELS}` (validator is source of truth) |
| Namespace single-char prefixes on common nouns | `${NAMESPACE_PREFIX}` + project / skill / plugin / personal / canonical |
| Migration / history tags | `${MIGRATION_TAGS}` |

Also strip:

- process/iteration residue in live rules: parenthetical archive/status notes ("已归档", "仅 skill", dual-form status), or migration chatter that is not an operator-facing how-to
- self-named authority wrappers ("this file is exempt", "bar self-downgrade", "skip fs check because referenced")
- duplicate operator-identity introductions
- invented strong constraints without provenance

## Layer routing (Step 6)

| Kind of learning | Write target |
|------------------|--------------|
| Cross-project durable rule | user-level CLAUDE.md **or** user-level rules topic file |
| Project-shared durable rule | project `./CLAUDE.md` **or** `./.claude/rules/<topic>.md` |
| Session / pattern note | auto memory (MEMORY.md index pointer + topic file) |
| One-shot process | do not store as memory — prefer hook / slash command / scoped rule |

Never write secrets (API keys, tokens, passwords) into any layer. Cite env var names only.

## Conflict priority (high → low)

1. Managed / enterprise policy
2. Operator's newest explicit instruction or correction
3. Scope specificity (project overrides user-level)
4. Still conflicting → rewrite into **one** clear rule; leave no duplicate

## Provenance

Every rewritten rule must keep a real provenance pointer (session note path marked `[citation]`, ticket, or prior rule path). Agent guesses must be tagged `[agent inference · unconfirmed]` and must not be upgraded to hard constraints.
