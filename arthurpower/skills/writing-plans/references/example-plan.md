# Example: 5-task multi-file change (user profile page)

A complete Plan Format fill-in showing the full template in action — Goal / Architecture / Tech Stack / Spec link + Tasks (ordered by dependency, [parallel] markers, [blocks: T1, T2] dependencies, 1 commit per task, binary acceptance criterion) + Cross-references (ACR verdict + S1-S6 affected + parallelization surface). Adapt for any multi-file change.

```markdown
# Plan: user profile page

**Goal**: 1 个新 page 让 logged-in user 看 / 编辑自己的 profile (avatar / display name / email preferences)
**Architecture**: 1 new page (`/profile`) + 1 new API route (`GET /api/me` / `PATCH /api/me`) + 1 new form component (复用 design system) + 1 new DB migration (add `display_name` + `email_prefs` columns)
**Tech Stack**: Vue 3.5 (page) + FastAPI (API) + Pydantic (schema) + Alembic (migration) + Postgres (DB)
**Spec link**: `docs/specs/user-profile.md`

## Tasks (ordered by dependency)

1. **DB migration: add columns** — affects: `migrations/versions/abc_add_profile_fields.py`
   - Acceptance: `alembic upgrade head` exit 0; `\d users` shows new columns; `alembic downgrade -1` exit 0
   - Commit: 1 commit = this 1 task
   - Status: [ ] pending

2. **Pydantic schema: UserProfile + UserProfileUpdate** — affects: `src/schemas/user.py`
   - Acceptance: `UserProfile.from_db_row(row)` returns instance; `UserProfileUpdate(email_prefs={"marketing": False})` validates; pytest covers empty / invalid email / too-long display_name
   - Commit: 1 commit = this 1 task
   - [blocks: T3, T4]

3. **[parallel] API route: GET /api/me + PATCH /api/me** — affects: `src/api/routes/me.py`
   - Acceptance: `curl -X GET /api/me -H "Cookie: session=..."` returns 200 + UserProfile; `curl -X PATCH /api/me -d '{"display_name": "..."}'` returns 200; unauthorized 401
   - Commit: 1 commit = this 1 task
   - [blocks: T1, T2]

4. **[parallel] Form component: ProfileForm.vue** — affects: `web/src/components/ProfileForm.vue`
   - Acceptance: `pnpm test ProfileForm` exit 0; form submits PATCH /api/me; displays validation errors; matches design system
   - Commit: 1 commit = this 1 task
   - [blocks: T2]

5. **Page: /profile route + integration** — affects: `web/src/pages/Profile.vue` + `web/src/router/index.ts`
   - Acceptance: navigate to /profile loads form, submit updates display, refresh shows new value; `pnpm test` exit 0
   - Commit: 1 commit = this 1 task
   - [blocks: T3, T4]

## Cross-references
- architecture-change-reviewer verdict: yes per all 5 Core Skills (bounded-context OK / contract 5-class / error typed / complexity ≤ 30 lines / 1 commit per task)
- affected S1-S6 skills: S2 (defensive-contract for API + form), S6 (1 commit per task, no refactor mixed)
- parallelization surface: T3 + T4 are truly parallel (different files, no shared state)
```