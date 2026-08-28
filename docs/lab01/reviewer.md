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
Looks good, this fits the issue well. The endpoint returns the right payload, the Supertest checks cover both the status code and the body, and the button flows through loading, online, and offline nicely on the client. Tests for those states are there too.

Two small things, neither blocking. The API URL is hardcoded to localhost:3000 in App.tsx, so it's probably worth moving to an env variable or a Vite proxy at some point. And there's no client test for the happy path where the status actually shows "Online", just the loading and failure ones.

Otherwise nothing to flag. Good to go from my side.

**My Response:**
Thanked peer for thorough review. No changes required.

---

### Issue 3
**Comment from peer:**
This reads really well. The categories match the four from the issue exactly, the seed is idempotent so rerunning it is safe, and the disconnect in finally keeps the script from hanging. The model looks right too.

Only catch is I couldn't run it without a Postgres connection, so I reviewed by eye rather than by executing. Nothing to change from me. Happy to approve.

**My Response:**
Thanked peer naja.

---

### Issue 4
**Comment from peer:**
Nice work, this covers issue #4 cleanly. The categories route queries Prisma in the right order, the client fetches health and categories in parallel, and the list renders from real API data. The tests are thorough too, especially UI-05 proving the categories aren't hardcoded.

A few things I noticed:

The category tests hit the real database. They only pass against a running, seeded Postgres, so the server test suite isn't self-contained anymore. Also the "exactly 4 items" check breaks if the seed changes. Worth mocking Prisma or documenting that tests need a DB up.

The categories route has no error handling, so a down database returns a default HTML 500 instead of JSON. The client handles it gracefully either way, just a consistency thing.

Minor: the docs are split between docs/lab-01/ and docs/lab01/, might be nice to pick one folder.

Nothing blocking. Good to go.
**My Response:**
I already remove docs/lab-01/ and update docs/lab01, Thanks naja.

---

## PRs I Reviewed for My Peer

| Issue | PR Link | My Comment |
|-------|---------|------------|
| Issue 1 | https://github.com/ovenmakemeheat/toktickit/pull/44 | Flagged version mismatch between package.json and lockfile. Asked why the versions were inconsistent. |
| Issue 2 | https://github.com/ovenmakemeheat/toktickit/pull/45 | Nothing to change. Approved. |
| Issue 3 | https://github.com/ovenmakemeheat/toktickit/pull/46 | Looks good. Approved. |
| Issue 4 | https://github.com/ovenmakemeheat/toktickit/pull/47 | All looks good. Approved. |
