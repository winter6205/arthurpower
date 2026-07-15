# Spec Template

Use this template when writing a spec document. Nine core areas. Do not skip any. Add fields only when the project demands them; never delete numbered sections.

```markdown
# Spec: <feature name>

## Objective
What we are building and why. Who is the user. What does success look like.

## Tech Stack
Framework, language, key dependencies with versions. Tech stack changes require a new assumption gate.

## Commands
Full executable commands with flags, not tool names.
Build: <cmd>
Test: <cmd>
Lint: <cmd>
Dev: <cmd>

## Project Structure
Where source code lives, where tests go, where docs belong.

## Code Style
One real snippet beats three paragraphs of description. Naming + formatting + example of good output.

## Testing Strategy
Framework, test locations, coverage targets, test level per concern (unit / integration / e2e).

## Boundaries
- Always do: <run tests before commit, follow naming, validate inputs>
- Ask first: <schema changes, new deps, CI changes>
- Never do: <commit secrets, edit vendor, remove failing tests without approval>

## Success Criteria
Specific, testable, binary. Each criterion maps to a measurable check.

## Open Questions
Anything unresolved that needs human input before PLAN.
```

## Assumption Listing Format

```
ASSUMPTIONS I'M MAKING:
1. <assumption>
2. <assumption>
3. <assumption>
→ Correct me now or these become the spec.
```

## Vague-to-Binary Reframing Format

```
REQUIREMENT: "Make the dashboard faster"

REFRAMED SUCCESS CRITERIA:
- Dashboard LCP < 2.5s on simulated 4G
- Initial data load < 500ms at p95
- CLS < 0.1 during load
→ Are these the right targets?
```