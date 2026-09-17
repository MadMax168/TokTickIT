# Issue 2: data, migration and authentication

Implemented on `feature/15-data-prep`, based on `lab03-staging` (the repository uses lab03, not lab3). No merge, push or PR is part of this task.

## Approved staging boundary

The user approved staged integration on 2026-09-17. Complete auth middleware is built and tested independently. Only the authentication route family uses session handling now: login is public with Origin validation, logout accepts absent/expired sessions, and me/change-password require active sessions. Existing Ticket/Attachment routes continue using the Lab 2 header. API-04/API-07 remain Planned; AUTH-CHANGE/AUTH-CSRF record verified auth-only portions. MIG-01a/MIG-02a record database/seed integrity; MIG-01b/MIG-02b remain Planned for authenticated historical access, selector retirement and collaboration API visibility in Issues 3/4.

The new shell is at `/login`, `/change-password` and role navigation paths. Business destinations have explicit pending-implementation states. The original selector and Requester screens remain at `/legacy-requester`. This intermediate branch is not a deployable completion of Sprint 3 authorization.

## Local configuration and credentials

- `DATABASE_URL`: intended PostgreSQL database; do not point migration tests at production.
- `APP_ORIGIN`: exact frontend origin, e.g. `http://localhost:5173` (default). Hostnames are exact: use `http://127.0.0.1:5173` if that is your browser address. Production must use HTTPS and `NODE_ENV=production` for Secure cookies.
- `LAB03_CREDENTIALS_FILE`: absolute path to an operator-managed JSON object mapping normalized emails to unique initial passwords. Keep it outside the repository with mode 0600; do not put passwords on command lines or in source. Passwords must meet the contract (12–128 code points, not all whitespace). No real/default password values are supplied by this project.
- `LAB03_TEST_DATABASE_URL`: isolated test PostgreSQL connection for integration/browser tests. Tests create random schemas; browser tests own only the explicitly named `lab03_auth_e2e` schema. Test passwords are generated in memory and do not authenticate production accounts.

Development fixture identities: niran.somchai@example.test, aree.chai@example.test, kanya.suksai@example.test, thanawat.arun@example.test, pimchanok.inactive@example.test; staff1@example.test through staff4@example.test (staff4 inactive); admin1@example.test and admin2@example.test. Supply credentials for missing fixture accounts only. All newly seeded accounts require a first-login change. These identities/credentials are local-development-only.

From `server/`, after backing up the intended database and attachment store:

```sh
npx prisma migrate deploy
npx prisma generate
npx tsx prisma/provision-users.ts
npm run db:seed
```

Provisioning requires the credential file to contain a unique valid password for every migrated unprovisioned email, including inactive accounts. It validates the entire set before writing hashes transactionally, preserves active state, and never resets an already provisioned user. `db:seed` uses the same environment file for newly created demo accounts. Repeat seed preserves passwords, activity, roles, tickets, Public Comments and Internal Notes. Production uses migration/provisioning only; never run the demonstration seed there.

`LAB02_SEED=true` selects the legacy empty-ticket E2E fixture instead of the Lab 3 demonstration seed. This compatibility fixture mirrors its requester IDs into locked User records so the new foreign key stays valid. It is used only by the retained Lab 2 E2E harness, not by normal Lab 3 development provisioning.

## Migration safety and operational decisions for reviewer sign-off

The migration is transactional, aborts on normalized email collisions/orphan requester references, copies legacy identities with matching IDs and activity/timestamps, backfills IT Priority from Requested Priority, and switches the Ticket requester FK to User. No Ticket/Attachment rows, storage keys, removed metadata or stored bytes are deleted. Production migration inserts no example collaboration records. SQL checks enforce normalized User emails; a database trigger revokes sessions on role, activity or password changes, including direct SQL updates.

The legacy DevelopmentRequester table is intentionally retained during this approved boundary. Retirement belongs to Issue 3. Before any retirement, verify User/legacy mapping and all business-route ownership tests.

**Provisioning decision:** migrated Users temporarily carry the non-password marker `!UNPROVISIONED`; verification cannot accept this marker. The operator must provide unique credentials and complete provisioning before opening auth access. This separates SQL schema migration from password hashing and does not introduce a shared or usable default password. Reviewer sign-off is requested for this staged provisioning mechanism.

**Operational defaults:** use the direct socket IP for the rolling login limit (`trust proxy` is not enabled). If deployed behind a proxy, review explicit trusted proxy configuration rather than trusting arbitrary forwarded headers. Login attempts serialize with a PostgreSQL advisory lock for correct rolling-limit accounting at lab scale. Expired attempt records are cleaned on login. Database failures fail closed with safe errors.

For a migration failure before commit, PostgreSQL rolls back the schema/data transaction. For a rollback after commit, stop writes and restore the pre-migration database backup together with its corresponding attachment-store snapshot, then deploy the matching old application. There is no destructive automatic down migration; restoring a backup after subsequent writes loses those writes, so capture/export them before any deliberate recovery. The old requester table is retained but is not by itself a complete rollback mechanism.

## Issue 2 → Issue 3 handoff notes

Each of these routes in `server/src/app.ts` has an explicit TODO and **still uses `X-Development-Requester-Id` via `requester-context.ts`**, not the authenticated User:

1. `POST /api/tickets`
2. `GET /api/tickets`
3. `GET /api/tickets/:ticketId`
4. `POST /api/tickets/:ticketId/attachments`
5. `GET /api/tickets/:ticketId/attachments`
6. `GET /api/tickets/:ticketId/attachments/:attachmentId/download`
7. `DELETE /api/tickets/:ticketId/attachments/:attachmentId`

Issue 3 must derive Requester identity from `req.user.id`, apply the must-change and role gates, and apply Origin/CSRF validation to mutations. Ignore the old header, reject explicit requesterId input, preserve non-disclosing cross-owner errors, and wire S/A read permissions according to the contract. Check creation replay projection for safe attachment metadata. The only create-route behavioral addition here is initializing the required IT Priority from Requested Priority so the schema change remains compatible.

Also retire `GET /api/development-requesters` with the documented generic 404; remove `/legacy-requester`, RequesterSelection and the in-memory selector context; connect shell Requester navigation to migrated screens; replace header-based browser fixtures with real login. Verify MIG-01b and the selector part of MIG-02b, then complete API-04/API-07 integration assertions. Issue 4 supplies the comments/notes API visibility assertions in MIG-02b. Do not mark these entire rows Pass based on this issue's auth-only evidence.

The reusable entry points are `createSessionResolver` in `server/src/auth/router.ts` and `createAuthMiddleware` in `server/src/auth/middleware.ts`. The middleware attaches safe `req.user` and `req.authSession`. Default behavior rejects password-change-required users; only auth endpoints opt into `allowRestricted`. An explicit roles array enforces route role authorization. Future business mutations must also use the Origin/CSRF policy (currently enforced by the auth router).

## Verification

See `issue02-test-output.txt` for the final captured command output. Unit/component regressions, isolated PostgreSQL migration/auth tests, production builds and the browser authentication flow are run separately. API-04/API-07 and deferred integration rows remain Planned even though their auth-only subsets pass. Migration evidence uses an isolated populated Lab 2 fixture, not the user's development database.

Final verification on 2026-09-17: **84 server tests, 38 client tests, 3 authentication browser runs and 6 retained Lab 2 browser tests passed**. Both production builds passed using explicit `npm run build` from each package directory. The existing root Bun wrapper printed command help on this installed runtime, so its zero exit code was not used as build evidence; the explicit build output is appended at the end of the log. The final auth/browser rerun includes the shared password validation and previous-page cancellation changes. Native Bun Argon2id hashing/verification also passed.

The populated migration fixture preserved **1 → 1 Ticket, 1 → 1 Attachment and 2 → 2 mapped Requester Users**, with zero orphan requester foreign keys. Tests compare original fields, IDs, activity and timestamps, plus IT Priority backfill. Repeat-seed tests verify all account/ticket distributions and preservation of edited comments/notes, stable IDs and credentials. These are isolated-database results; the user's development database was not migrated.

No unresolved contract conflict remains within the approved boundary. The provisioning mechanism and operational defaults above are explicit assumptions for reviewer sign-off. Deferred authentication of business routes is the user's approved staging decision, not an assertion of complete Sprint 3 authorization.

## Created and modified files

Paths below are repository-relative; directory entries list their files explicitly.

### Schema/migration

- `server/prisma/schema.prisma`
- `server/prisma/migrations/20260917000000_lab3_auth/migration.sql`

### Seed/provisioning

- `server/prisma/seed.ts`
- `server/prisma/seed-lab03.ts`
- `server/prisma/provision-users.ts`

### Server authentication and integration

- `server/src/auth/middleware.ts`
- `server/src/auth/password.ts`
- `server/src/auth/router.ts`
- `server/src/app.ts`
- `server/src/prisma.ts`
- `server/package.json`
- `server/package-lock.json`

### Client authentication UI

- `client/src/lab03/AuthApplication.tsx`
- `client/src/lab03/AuthenticatedShell.test.tsx`
- `client/src/lab03/ChangePassword.test.tsx`
- `client/src/lab03/Login.test.tsx`
- `client/src/lab03/auth.css`
- `client/src/main.tsx`
- `client/vite.config.ts`

### Tests and evidence

- `server/tests/lab03/auth-middleware.unit.test.ts`
- `server/tests/lab03/auth.api.test.ts`
- `server/tests/lab03/db.ts`
- `server/tests/lab03/migration.integration.test.ts`
- `server/tests/lab03/password-hash.unit.test.ts`
- `server/tests/lab03/password-policy.unit.test.ts`
- `e2e/lab03/authentication.spec.ts`
- `e2e/lab03/global-setup.ts`
- `playwright.lab03.config.ts`
- `e2e/global-setup.ts`
- `e2e/lab02/requester-ticket-flow.spec.ts`
- `artifacts/lab03/screenshots/auth/desktop-change-password.png`
- `artifacts/lab03/screenshots/auth/desktop-login.png`
- `artifacts/lab03/screenshots/auth/desktop-shell.png`
- `artifacts/lab03/screenshots/auth/mobile-change-password.png`
- `artifacts/lab03/screenshots/auth/mobile-login.png`
- `artifacts/lab03/screenshots/auth/mobile-shell.png`
- `artifacts/lab03/screenshots/auth/tablet-change-password.png`
- `artifacts/lab03/screenshots/auth/tablet-login.png`
- `artifacts/lab03/screenshots/auth/tablet-shell.png`
- `docs/lab03/tests.md`
- `docs/lab03/issue02-test-output.txt`
- `.gitignore`

Implementation and handoff documentation: `docs/lab03/issue02-implementation.md`.
