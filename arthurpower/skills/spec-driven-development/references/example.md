# Example — Full SPECIFY Phase Walkthrough

1 end-to-end runnable example showing the full SPECIFY phase from vague ask to spec doc + 5-verdict gate.

```markdown
# SPECIFY phase: user profile page

## Human reviewer ask
"Add a profile page where users can edit their display name and email preferences."

## Step 1 — Assumptions surfaced (gate)
ASSUMPTIONS I'M MAKING:
1. Web app (Vue 3 SPA), not native mobile
2. Auth is session cookie (existing), not OAuth/OIDC
3. Postgres + Alembic (existing stack), not MongoDB
4. Form submission is partial update (PATCH), not full PUT
5. Email preferences is a JSON column (marketing / transactional / digest), not a separate table
6. Avatar upload is out of scope (separate ask)
→ Human reviewer confirms: 1-6 yes, 6 explicitly deferred.

## Step 2 — Spec doc (committed at specs/user-profile.md)

# Spec: user profile page

## Objective
Logged-in user views and edits their own profile (display name, email preferences). Read-only for other fields (email, created_at).

## Tech Stack
Vue 3.5 (page + form) + FastAPI (API) + Pydantic v2 (schema) + Alembic (migration) + Postgres 15.

## Commands
Dev: pnpm dev (frontend) + uvicorn src.main:app --reload (backend)
Test: pnpm test (frontend) + pytest tests/ -q (backend)
Lint: pnpm lint + ruff check src/
Migrate: alembic upgrade head

## Project Structure
web/src/pages/Profile.vue          — page entry
web/src/components/ProfileForm.vue — form component (reuses design system)
src/api/routes/me.py               — GET /api/me + PATCH /api/me
src/schemas/user.py                — UserProfile + UserProfileUpdate
migrations/versions/<hash>_profile.py — add display_name + email_prefs columns

## Code Style
Vue 3.5 composition API + <script setup lang="ts">. Pydantic v2 BaseModel + model_validator. 2-space indent, single quotes, no semicolons.

## Testing Strategy
- Unit: Pydantic schemas (pytest), form validation (vitest)
- Integration: API route (pytest + httpx.AsyncClient + test DB)
- E2E: profile page navigation + edit + refresh (playwright)
- Coverage: ≥ 80% line, ≥ 70% branch

## Boundaries
- Always: run tests before commit, validate form inputs, sanitize display_name
- Ask first: schema changes, new deps, CI config changes
- Never: commit secrets, edit vendor, remove failing tests without approval

## Success Criteria
- GET /api/me returns 200 with UserProfile JSON for authenticated user
- PATCH /api/me accepts partial update, returns 200 with updated profile
- Unauthenticated request to /api/me returns 401
- Invalid display_name (>50 chars / empty / control chars) returns 422
- Form shows validation errors inline
- Refresh shows new display_name and email_prefs values
- pnpm test + pytest -q both exit 0
- playwright e2e profile-flow.spec.ts passes

## Open Questions
(none — assumption gate cleared all)

## Step 3 — Reframed success criteria (binary)
- display_name length ∈ [1, 50] and not control chars → 422 otherwise
- email_prefs is JSON object with marketing/transactional/digest boolean keys
- PATCH /api/me returns 200 + updated profile in < 200ms p95
- playwright profile.spec.ts exits 0

## Step 4 — architecture-change-reviewer verdict block
bounded-context-guardian: yes — users/ bounded context exists, new code lives in users/api/, no cross-context import.
defensive-contract-validator: yes — UserProfileUpdate covers empty display_name (422), too-long (422), invalid email_prefs (422), unauthenticated (401), DB failure (typed ProfileUpdateError).
error-handling-enforcer: yes — typed exception ProfileUpdateError, no empty catch, // EXIT: validation failed, return 422 documented on early-return.
complexity-anti-drift: yes — update_profile() ≤ 30 lines (3 helpers: validate_display_name / coerce_email_prefs / persist), nesting ≤ 4, params ≤ 3.
minimal-change-verifier: yes — 1 logical task (user profile page), 1 commit per task, no refactor mixed with feature.

All 5 verdicts yes → spec advances.

## Step 5 — Hand off to writing-plans
Spec path: specs/user-profile.md
Plan path: plans/user-profile.md (consumed by writing-plans)
```

Note: The example shows the full SPECIFY phase loop — Step 1 assumption gate (6 assumptions confirmed individually + 1 explicitly deferred) → Step 2 nine-section spec doc → Step 3 vague-to-binary reframing → Step 4 ACR 5-verdict all yes → Step 5 handoff to writing-plans. Each step corresponds to a real failure mode (assumptions skipped → silent context drift / vague criteria → unverifiable "done" / ACR skip → plan on shaky ground).

## Cross-references

- Architecture gate: `architecture-change-reviewer` (5-verdict frame, runs after SPECIFY)
- Plan + tasks + implement: `writing-plans` (PLAN / TASKS / IMPLEMENT, consumes the spec)
- Bounded context ownership: `bounded-context-guardian` (verdict 1 of 5)
- Defensive contract: `defensive-contract-validator` (verdict 2 of 5, 5 boundary classes)
- Error handling: `error-handling-enforcer` (verdict 3 of 5, typed exceptions)
- Complexity: `complexity-anti-drift` (verdict 4 of 5, ≤ 30 lines / nesting ≤ 4)
- Minimal change: `minimal-change-verifier` (verdict 5 of 5, 1 commit per task)
- Skill authoring: `skill-authoring` (CSO + TDD-for-skills for this skill)