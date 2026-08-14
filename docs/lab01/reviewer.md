# Peer Review — CPE334 Lab 1: TokTickIT

## My Reviewer Details

| Field | Value |
|-------|-------|
| Reviewer Name | Guntee Doungmanee |
| Student ID | 67070501003 |
| GitHub Username | ovenmakemeheat |

---

## PRs Reviewed by My Peer

| Issue | PR Link | Review Outcome |
|-------|---------|----------------|
| Issue 1: Project Foundation | https://github.com/MadMax168/TokTickIT/pull/5 | Approved (after dependency fix) |
| Issue 2: Health Check | https://github.com/MadMax168/TokTickIT/pull/6 | Approved |
| Issue 3: Category Seed | https://github.com/MadMax168/TokTickIT/pull/7 | Approved |
| Issue 4: Category List | https://github.com/MadMax168/TokTickIT/pull/8 | Approved |

---

## Review Comments I Received

### Issue 1
**Comment from peer:**
Three items flagged before merge:
1. `prisma` and `dotenv` were missing from server/package.json dependencies, causing the server not to start.
2. Test files were wired up but empty — noted as acceptable for this issue but flagged for awareness.
3. Small cleanups: `vite.config.ts` should import `defineConfig` from `vitest/config` for proper type checking, `db:seed` pointed to a seed file not yet created, and `server/generated/` should be added to `.gitignore` to prevent committing the Prisma generated client.

**My Response:**
Added `prisma` and `dotenv` to server/package.json, updated `vite.config.ts` to import from `vitest/config`, and added `server/generated/` to `.gitignore`. Acknowledged that empty test files and missing seed script are intentional and will land in later issues.

---

### Issue 2
**Comment from peer:**
Two non-blocking observations:
1. API URL is hardcoded to localhost:3000 in App.tsx — suggested moving to an env variable or Vite proxy.
2. No client-side test for the happy path where status shows Online, only loading and failure states covered.

**My Response:**
Acknowledged both points. Hardcoded URL is acceptable for local development in Lab 1 scope and will be addressed in a later sprint. Happy path test is noted as a gap to fill.

---

### Issue 3
**Comment from peer:**
Approved without changes. Peer confirmed the four categories match the issue exactly, seed is idempotent, and disconnect in finally is correct. Reviewed by eye as no Postgres connection was available.

**My Response:**
Thanked peer for thorough review. No changes required.

---

### Issue 4
**Comment from peer:**
Approved with three non-blocking observations:
1. Category tests hit the real database — they only pass against a running seeded Postgres
   instance, so the server test suite is not self-contained. The "exactly 4 items" check
   would also break if the seed changes. Suggested mocking Prisma or documenting
   that tests require a live DB.
2. The categories route has no error handling — a down database returns an HTML 500
   instead of JSON. The client handles it gracefully either way, flagged as a consistency issue.
3. Minor: docs are split between docs/lab-01/ and docs/lab01/ — suggested picking one folder.

**My Response:**
Acknowledged all three points. Database-dependent tests are a known limitation for Lab 1 scope.
Will add a note to tests.md documenting that server tests require a running seeded Postgres.
Error handling on the categories route and Prisma mocking are noted as improvements
for a future sprint. Fixed the docs folder inconsistency by standardising to docs/lab-01/.

---

## PRs I Reviewed for My Peer

| Issue | PR Link | My Comment |
|-------|---------|------------|
| Issue 1 | https://github.com/ovenmakemeheat/toktickit/pull/44 | Flagged version mismatch between package.json and lockfile. Asked why the versions were inconsistent. |
| Issue 2 | https://github.com/ovenmakemeheat/toktickit/pull/45 | Nothing to change. Approved. |
| Issue 3 | https://github.com/ovenmakemeheat/toktickit/pull/46 | Looks good. Approved. |
| Issue 4 | https://github.com/ovenmakemeheat/toktickit/pull/47 | All looks good. Approved. |
