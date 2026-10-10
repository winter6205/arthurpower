# skill-authoring — Local Docs Sync Reference

## Local Docs Sync

When a skill is added, renamed, behavior-changed, or removed under `arthurpower/skills/<name>/`, sync its local docs page so that humans browsing the project tree see the same trigger boundary and behavior as agents reading the SKILL.md.

### When to sync

- New skill appears under `arthurpower/skills/<name>/SKILL.md`
- Existing skill's `description` in frontmatter changes by more than 50 chars
- Existing skill's `Procedure` section adds or removes a numbered step
- Existing skill is renamed or moved to another bucket

### Local docs file format

Path: `docs/<bucket>/<skill-name>.md` (where `<bucket>` is `engineering` / `productivity` / `agent-development` / etc., mirroring plugin skill organization).

Required sections, matching the SKILL.md structure:

- `# <Skill Name>` (H1, slug-derived title)
- One-paragraph `## What it does` (≤ 80 words, plain prose)
- Bullet list `## When to reach for it` (3-6 items, mirroring `When to use`)
- Short `## Where it fits` linking to `using-agent-skills` for routing context

### Promoted-skill page frame

Promoted `engineering` / `productivity` skills require a page. Non-promoted buckets (`misc`, `personal`, `in-progress`, `deprecated`) do not. Presence is part of promotion (ADR-0011).

Fixed frame, in order: **Quickstart** (copy-runnable); **Absolute SKILL.md link** (`arthurpower/skills/<name>/SKILL.md`); **What it does** (one-sentence job + the defining constraint in prose); **When to reach for it** (invocation mode + trigger; name a sibling when confusable); **Where it fits** (chain step / setup / maintenance / standalone, neighbours with because-clauses, link to `using-agent-skills`).

### Sync procedure

1. Detect the change (new file, modified frontmatter, modified body).
2. Locate the matching `docs/<bucket>/<skill-name>.md`. Create if absent.
3. Diff the SKILL.md against the docs page. Identify drift.
4. Rewrite the docs page to mirror the new SKILL.md. Do not paraphrase away the trigger boundary — keep the same routing terms.
5. Verify the docs page links resolve: any `@<file>` reference must point to a real path.

### Acceptance

- [ ] Local docs file exists for every promoted skill
- [ ] `## When to reach for it` mirrors `When to use` trigger boundaries
- [ ] All `@<file>` references resolve to existing files
- [ ] No copy of frontmatter `description` word-for-word (humans get prose, not routing-speak)
