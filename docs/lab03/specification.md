# Sprint 3 engineering specification

Status: Draft for human approval. Contract only; no implementation or test results are claimed.

## 1. Sprint Goal

Replace the temporary Requester selector with authenticated access and deliver shared IT ticket handling and minimal account administration without losing the Lab 2 Requester workflow.

## 2. Stakeholder Request

People requesting support need private access to their own tickets and a way to discuss progress. IT Staff need a shared work list, explicit responsibility, prioritization, and controlled status changes. Administrators need to provision and disable individual accounts safely.

## 3. Scope

Included: email/password login, required initial-password replacement, logout, three single-role identities, authenticated migration of existing Requesters, all existing Requester ticket/attachment behavior, Public Comments, a Requester resolution indicator, IT queue/detail/ownership/priority/status handling, Internal Notes, and user administration. Simple pagination and single-field sorting are explicit choices below, not a requirement for a complex query builder.

Explicitly excluded: invitations or password-reset emails; MFA, social login, SSO, self-registration; Actions Taken; SLA calculation, escalation, notifications; analytics beyond simple queue counts; multiple tenants or departments; user deletion, bulk operations, import/export, account-history screens; multiple roles per user. No ticket-content editing, comment/note editing or deletion, or reference-data administration is introduced.

## 4. Functional Requirements

Endpoint IDs refer to [api-spec.md](api-spec.md); screen IDs refer to [ui-spec.md](ui-spec.md). Test IDs refer to [tests.md](tests.md). Each row is a complete trace from behavior to observable surface and planned evidence.

| ID | Requirement | Endpoint IDs | Screen/state | AC | Planned tests |
| --- | --- | --- | --- | --- | --- |
| FR-01 | Authenticate active accounts and safely limit failed attempts. | EP-01 | UI-01 login | AC-01, AC-05, AC-06 | API-01, API-02, API-03 |
| FR-02 | Gate normal access until initial password is changed; support authenticated password changes. | EP-03, EP-04 | UI-02 required/edit | AC-02, AC-07 | API-04, E2E-02 |
| FR-03 | Restore current identity, end sessions, and display role-scoped navigation. | EP-02, EP-03 | UI-03 loading/logout/nav | AC-08, AC-09 | API-05, UI-03 |
| FR-04 | Enforce authorization and session-derived Requester ownership on every ticket/attachment operation. | EP-07–EP-12 | UI-04, UI-05, UI-06 denied | AC-03, AC-10 | SEC-01, SEC-02 |
| FR-05 | Preserve active references, validated ticket creation, numbering, idempotency, and partial upload recovery. | EP-05, EP-06, EP-07, EP-10 | UI-04 create/saved | AC-11 | API-09, UI-04, E2E-01 |
| FR-06 | Preserve owned search/filter/sort/pages and detail, extending status display. | EP-08, EP-09 | UI-05 list, UI-06 view | AC-12 | API-10, UI-05 |
| FR-07 | Preserve attachment upload, metadata, download, and confirmed soft removal. | EP-09–EP-12 | UI-06 attachments | AC-13 | API-11, UI-06, E2E-01 |
| FR-08 | Provide a shared queue with deterministic search, filters, sort, pages, and matching count. | EP-13 | UI-07 queue | AC-14 | API-12, UI-07 |
| FR-09 | Provide all-ticket detail and read-only attachment access to IT Staff and Administrators. | EP-09, EP-11, EP-12a | UI-08 detail | AC-15 | API-13, UI-08 |
| FR-10 | Allow IT Staff to claim, assign, and reassign an IT owner safely. | EP-14, EP-15 | UI-08 ownership | AC-16 | API-14, UI-08 |
| FR-11 | Initialize IT Priority from Requested Priority and allow IT Staff or Administrators to change it independently. | EP-07, EP-16 | UI-08 priority | AC-17 | API-15 |
| FR-12 | Enforce the status matrix and explicit transition confirmation. | EP-17 | UI-08 status | AC-18, AC-19 | API-16, API-17, UI-08 |
| FR-13 | Let authorized participants list and create Public Comments. | EP-18, EP-19 | UI-06, UI-08 public discussion | AC-20 | API-18, UI-09 |
| FR-14 | Let only IT Staff and Administrators list and create Internal Notes. | EP-20, EP-21 | UI-08 internal notes | AC-04, AC-21 | API-08, API-19, UI-09 |
| FR-15 | Let the owning Requester set/clear an informational resolution indicator without setting status. | EP-22 | UI-06 indicator, UI-08 view | AC-22 | API-20, UI-09 |
| FR-16 | Let Administrators list/search/filter, create, edit, activate/deactivate, and set initial passwords for users. | EP-23–EP-26 | UI-09 user panels | AC-23–AC-26 | API-21, API-22, API-23, API-24, UI-10 |
| FR-17 | Preserve historical ticket/attachment ownership while replacing DevelopmentRequester with User. | EP-01, EP-07–EP-12 | UI-01 migrated login, UI-05, UI-06 historical data | AC-27 | MIG-01, MIG-02 |
| FR-18 | Apply safe errors, accessible feedback, and responsive Zen Green presentation throughout. | EP-01–EP-26 | UI-01–UI-09 shared states | AC-28–AC-30 | SEC-03, STYLE-01, RESP-01, A11Y-01 |

## 5. Business Rules

| ID | Rule |
| --- | --- |
| BR-01 | Authentication succeeds only for an active User with valid email/password credentials. |
| BR-02 | `mustChangePassword=true` permits only current-user retrieval, password change, and logout after login. All normal APIs return `403 PASSWORD_CHANGE_REQUIRED`; normal screens remain inaccessible. |
| BR-03 | Requester identity comes exclusively from the session. Ignore the legacy identity header; reject body/query `requesterId` as invalid input, never use it to select ownership. Missing/cross-owner resources produce the same `404`. |
| BR-04 | Public Comments are visible to the owning Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator; they never appear in ticket detail, queue, public responses, or Requester UI state. |
| BR-05 | A Requester may mark a problem as apparently resolved but may never set formal status to Resolved or Closed (or any other status). |
| BR-06 | Track failures by normalized email and separately by source IP: five failed logins within a rolling 15 minutes cause subsequent attempts to return `429` until the oldest relevant failure expires. Unknown and inactive accounts use the same accounting and generic `401 INVALID_CREDENTIALS` as wrong passwords. Successful login clears the email failure bucket, not the IP bucket. No permanent account lock. Return `Retry-After` seconds for throttling. |
| BR-07 | All initial/new passwords are 12–128 Unicode code points, contain at least one non-whitespace character, and are not trimmed or normalized. No composition rule. New password must differ from the current password, and confirmation must match exactly. Initial-password setting also rejects reuse of the existing password. Current password is required for self-service change; wrong current password is `400 CURRENT_PASSWORD_INVALID`. |
| BR-08 | Logout revokes the current session and clears its cookie; repeat logout is `204`. Expired/revoked sessions cannot authenticate. Password changes revoke all sessions, then issue a fresh session for the changing user; administrator password setting revokes all target sessions without issuing one. |
| BR-09 | Check active state and current role on every authenticated request. Deactivation and role change revoke all target sessions immediately; activation does not restore sessions. Rejected inactive login does not disclose account state. |
| BR-10 | Trim/lowercase email before lookup and persistence; enforce uniqueness in the database, including inactive users. Email is syntactically valid, at most 254 characters; name is trimmed, 1–100 Unicode code points. Admin-only duplicate errors are `409 EMAIL_EXISTS`. |
| BR-11 | Current-user returns only safe identity fields and a session CSRF token, including for password-change-required sessions. Missing, expired, inactive, or revoked session returns `401`; never return a password hash or session ID. |
| BR-12 | Exactly one enum role per User: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. Requesters create/list their own tickets; Staff manage all tickets; Administrators read all tickets, add comments/notes, and update IT Priority; assignment and status mutations remain Staff-only. Role is never accepted from login or session clients. |
| BR-13 | New tickets have no IT owner. Only IT Staff may claim an unassigned ticket for themselves or assign/reassign to an active IT Staff User. Any active Staff member can manage any ticket regardless of current assignment. Ownership does not change status. Closed/Cancelled tickets cannot be reassigned. No unassign operation. |
| BR-14 | IT Priority initially copies Requested Priority on ticket creation and is never null; IT Staff or Administrators may set `LOW`, `MEDIUM`, or `HIGH` while not Closed/Cancelled. Requested Priority is unchanged. No priority-clearing action. |
| BR-15 | Only IT Staff may change status, and only according to the matrix below. Every status request needs `confirmed=true`; Resolved, Closed, and Cancelled also need a trimmed 3–200-character reason. All other transitions omit reason. The server records the latest transition actor/time/reason; no history screen. |
| BR-16 | Assignment, priority, status, and resolution-indicator writes require the current positive `version`. Compare and update atomically; stale writes return `409 TICKET_VERSION_CONFLICT` with no mutation. Accepted changes increment version; same owner/priority/indicator is an idempotent `200` no-op when the version matches. Self-status transitions are invalid. |
| BR-17 | Public Comment/Internal Note text is trimmed and 1–2000 Unicode code points; reject empty/whitespace and over-limit values. Store/render plain text; server sets author and time. Both can be added in every status, including Closed/Cancelled. Lists are oldest first with ID ascending tie-breaker. No edit/delete. |
| BR-18 | Only the owning Requester may set or clear `problemAppearsResolved`. It starts false, is allowed in every status, survives other changes, and never triggers status/ownership changes. It displays separately to all authorized ticket viewers. |
| BR-19 | Admin create requires name/email/one role/initial password; `active` defaults true. Edit allows name/email/role/active only. Password setting is a separate operation requiring confirmation and forces a change on next login, even for an inactive account; it never activates that account. |
| BR-20 | An Administrator cannot deactivate themselves or change their own role. No operation may leave fewer than one active Administrator; count and update must be transactionally serialized against concurrent requests. No user deletion. |
| BR-21 | Deactivation retains all tickets, ownership, comments, and notes. Assigned inactive Staff remain visible as inactive owners and can be reassigned by active Staff. A Staff role change is rejected while they own any ticket outside Closed/Cancelled; a Requester role change is rejected while any tickets reference them as requester. This avoids orphaning ownership access. |
| BR-22 | Preserve Lab 2 ticket fields, number format `TT-YYYYMMDD-XXXXXX` (suffix alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), server dates, summary 5–120 and description 20–4000 after trimming, active references, and UUID create idempotency. Equivalent normalized same-user replay returns original ticket; another user's key or different payload is a non-disclosing `409`. |
| BR-23 | Preserve allowed JPG/JPEG/PNG/WEBP/PDF extension and MIME matching, 5×1024×1024-byte limit, five active files, generated storage keys, partial upload recovery, active/removed metadata, and removal reason of 3–200 trimmed characters plus UI confirmation. Serialize active-count checks. Only owning Requesters upload/remove; Staff/Admin may read/download. Removed bytes cannot be served. Ticket status does not remove Requester attachment permissions. |
| BR-24 | Query defaults and validation are defined in api-spec.md. Only one sort field is supported. Existing My Tickets filters remain combinable; the new queue/admin UI offers one optional filter at a time. Unknown/repeated query parameters are `400` rather than silently ignored. |
| BR-25 | Mutations validate same-origin requests; authenticated mutations require a session-bound CSRF header. Authentication, role, and owned-resource checks precede business mutation. No secrets, internal notes, storage paths, database errors, or stacks in safe errors or unauthorized responses. |
| BR-26 | Loading/saving/success/validation/empty/no-results/forbidden/safe-failure states follow ui-spec.md. Clear protected cached state on session loss/account change and prevent stale responses from repopulating it. |

### BR-15 status transition matrix

Wire values map to labels: `NEW` New; `OPEN` Open; `IN_PROGRESS` In Progress; `WAITING_FOR_REQUESTER` Waiting for Requester; `RESOLVED` Resolved; `CLOSED` Closed; `REOPENED` Reopened; `CANCELLED` Cancelled.

| From | Permitted next statuses | Permitted role | Additional condition |
| --- | --- | --- | --- |
| NEW | OPEN, CANCELLED | IT_STAFF | None beyond confirmation/reason rules |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED | IT_STAFF | Active IT owner required for IN_PROGRESS |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | IT_STAFF | Active IT owner required for RESOLVED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | IT_STAFF | Active IT owner required for IN_PROGRESS or RESOLVED |
| RESOLVED | CLOSED, REOPENED | IT_STAFF | None beyond confirmation/reason rules |
| REOPENED | OPEN, IN_PROGRESS, CANCELLED | IT_STAFF | Active IT owner required for IN_PROGRESS |
| CLOSED | None | None | Terminal |
| CANCELLED | None | None | Terminal |

Every omitted pair (including same-state changes) is invalid: Staff receive `409 STATUS_TRANSITION_INVALID`. Requester/Admin status requests always receive `403 FORBIDDEN` before evaluating transitions. No automatic transitions on claim, comment, note, indicator, or attachment activity. A reopened ticket retains its existing owner and priority.

## 6. UI Specification Summary

[ui-spec.md](ui-spec.md) defines Login, Change Password, shared shell, preserved Create/My Tickets, Requester Detail, shared Queue, Staff/Admin Detail, and Administrator User Management. It reuses Lab 2 Zen Green components/tokens and defines role-specific controls, confirmations, keyboard behavior, and desktop/tablet/mobile states.

## 7. Data Changes

Summary for a later migration implementation issue; this task changes no schema.

- Replace `DevelopmentRequester` with `User`: integer ID, name, normalized unique email, passwordHash, role enum, active, mustChangePassword, createdAt, updatedAt. Preserve legacy Requester IDs, names, emails, active flags and timestamps where valid. Maintain required Ticket.requesterId foreign keys to User; new Staff/Admin IDs must not collide and the sequence must advance past preserved IDs.
- `Session`: hashed opaque token, User FK, issuedAt, lastSeenAt, absolute expiresAt, revokedAt, CSRF secret/token association. Index unique token hash and `(userId, revokedAt)` plus expiry for cleanup. Persist failed-attempt buckets with key/window timestamps so restarting the app does not bypass throttling; no account-history UI.
- Extend TicketStatus with the seven additional values. Add nullable assignedToId User FK, required itPriority enum, problemAppearsResolved default false, version integer default 1, nullable statusChangedById User FK/statusChangedAt/statusChangeReason. Existing tickets remain NEW and unassigned; backfill each existing ticket’s IT Priority from its Requested Priority before enforcing the non-null constraint. Keep existing Ticket and Attachment columns/uniqueness/indexes; add Ticket `(currentStatus,ticketDate,id)` and `(assignedToId,currentStatus)` indexes.
- Separate PublicComment and InternalNote models: integer ID, Ticket FK, authorId User FK, body, createdAt; index `(ticketId,createdAt,id)`. Relationships restrict user deletion and preserve attribution. User indexes support normalized email uniqueness and `(role,active,id)` lists. Session/author/assignee relationships are distinct from requester ownership.
- Migrate in a controlled maintenance window: back up DB and attachment store, preflight email normalization collisions and orphan references, abort rather than merge colliding accounts; copy all legacy identities and verify counts/FKs, then switch requester FK and retire the legacy table only after verification. Preserve ticket IDs/numbers/clientRequestIds/dates and all attachment rows/storage keys/files/removal metadata. No fabricated comments or notes. Failed migration rolls back database changes; do not modify stored files.
- Provision unique initial passwords for migrated identities via a controlled local/operator process; hash before persistence, mark all migrated users mustChangePassword=true, retain inactive flags. No default shared production password, credentials in repository/logs, or email delivery feature. The deployment operator supplies credentials securely outside the application.
- Keep the existing four Categories, seven Related Systems, four active Requesters and one inactive Requester in development fixtures. Add at least three active IT Staff, one inactive IT Staff, and two active Administrators using `.test` addresses; test fixtures include changed and must-change states. Seed by stable email; repeat runs must not reset existing passwords, roles, activity, or historical records. Initial development credentials come from explicit environment inputs. Provision at least one active Admin before opening application access.


### Development seed and test-fixture distribution

Per the peer-provided Lab 3 §5.3 correction, the repeat-safe development seed must include at least three active and one inactive IT Staff account. Preserve the Requester/reference fixtures above. Add at least 12 realistic demonstration tickets across all four active Requesters, all eight statuses, all three Requested Priority values, all three IT Priority values, and both assigned/unassigned ownership. Use meaningful support summaries/descriptions and matching Categories/Related Systems, not placeholder text.

A minimum deterministic distribution follows; A–D are the existing active Requesters and S1–S3 are distinct active IT Staff. Each row has a stable UUID clientRequestId used as its seed identity. Demo IT Priority starts equal to Requested Priority; tests separately exercise later changes. Dates are fixed, valid UTC values in chronological order.

| Demo ticket | Requester | Status | Requested / initial IT Priority | IT owner | Example issue |
| --- | --- | --- | --- | --- | --- |
| 01 | A | NEW | LOW | Unassigned | Printer produces faded pages |
| 02 | B | NEW | HIGH | Unassigned | Cannot access campus email |
| 03 | C | OPEN | MEDIUM | S1 | VPN disconnects repeatedly |
| 04 | D | OPEN | LOW | Unassigned | Software installation request |
| 05 | A | IN_PROGRESS | HIGH | S2 | Laptop cannot connect to Wi-Fi |
| 06 | B | WAITING_FOR_REQUESTER | MEDIUM | S3 | Missing details for account access |
| 07 | C | RESOLVED | LOW | S1 | Printer queue restored |
| 08 | D | CLOSED | MEDIUM | S2 | VPN configuration corrected |
| 09 | A | REOPENED | HIGH | S3 | Email access problem returned |
| 10 | B | CANCELLED | LOW | Unassigned | Duplicate software request cancelled |
| 11 | C | IN_PROGRESS | MEDIUM | S3 | Laptop application fails to launch |
| 12 | D | WAITING_FOR_REQUESTER | HIGH | S1 | Awaiting Wi-Fi diagnostic details |

These are development/test demo records, not transformations of historical Lab 2 tickets. Production migration does not insert demo tickets or change historical status. Seed insertion must not overwrite existing tickets, workflow changes, credentials or activity on rerun. Tests must assert account counts, every distribution dimension, realistic required fields, valid assignee roles, and repeat-seed preservation; isolated negative tests may additionally use an inactive historical owner.

## 8. API Contract

[api-spec.md](api-spec.md) is authoritative for endpoint shapes and safe errors. Existing `/api/tickets` and attachment paths remain; authenticated sessions replace header identity. `/api/development-requesters` is retired with a generic `404` and no identity list. Public Category/System endpoints remain public for Lab 2 compatibility; health remains unchanged. The authenticated shell waits for identity before business-data requests.

## 9. Acceptance Criteria

| ID | Given / When / Then |
| --- | --- |
| AC-01 | Given an active User with valid credentials, when login succeeds, then the backend creates authenticated access and returns safe identity and role. |
| AC-02 | Given mustChangePassword, when login succeeds, then normal screens and direct business APIs remain blocked until a valid new password is saved. |
| AC-03 | Given Requester A, when a client supplies B's requesterId or legacy header, then the server rejects explicit identity fields or ignores the header, derives A from the session, and never returns B's data. |
| AC-04 | Given a Requester, when either Internal Note endpoint is requested, then `403` is returned without note content or existence disclosure. |
| AC-05 | Given wrong credentials or an unknown email, when login is attempted, then a generic `401` results; after five failures in the rolling window subsequent attempts return `429` with Retry-After and recover after expiry. |
| AC-06 | Given an inactive account, when login or an old session is used, then login is indistinguishable from invalid credentials and the old session returns `401`. |
| AC-07 | Given a password-change session, when current/new/confirmation values hit valid and invalid boundaries, then only a valid distinct confirmed password is saved; all old sessions are revoked and a fresh unrestricted session is issued. |
| AC-08 | Given a session or no session, when current-user/logout is called, then safe identity or `401` is returned as specified; logout is repeat-safe and replay of the old cookie fails. |
| AC-09 | Given each role, when navigating or requesting forbidden APIs directly, then only that role's access is available; stale cached data disappears after session loss. |
| AC-10 | Given A and B tickets/attachments, when A attempts each read/write or create-key replay belonging to B, then no B data or mutation is possible, including swapped attachment parent IDs. |
| AC-11 | Given authenticated Requester input, when ticket creation, equivalent retry, invalid references/text, or partial upload occurs, then Lab 2 number/date/NEW/idempotency/validation and recovery behavior is preserved. |
| AC-12 | Given owned historical/new tickets, when list queries and detail are used, then ownership, all filter/sort/page rules and read-only content remain correct for all eight statuses. |
| AC-13 | Given owned attachments, when uploading, listing, downloading and confirmed soft-removing, then Lab 2 limits/metadata/errors hold, and removed content is unavailable. |
| AC-14 | Given Staff/Admin queue access, when valid/default/no-match/out-of-range/invalid queries are submitted, then deterministic filtered results and counts or `400` are returned. |
| AC-15 | Given Staff/Admin, when any ticket is opened, then detail and active attachment downloads are available, with no upload/remove controls; Admin can edit IT Priority but has no assignment or status controls. |
| AC-16 | Given active Staff and a mutable ticket, when claiming/assigning/reassigning, then an active Staff owner is saved without status change; stale claims, invalid targets and terminal tickets are rejected atomically. |
| AC-17 | Given a newly created ticket, its IT Priority equals Requested Priority; given Staff or Administrator, when setting IT Priority, then only allowed values on mutable tickets succeed and Requested Priority stays unchanged; Requesters and stale writes are rejected. |
| AC-18 | Given every allowed status pair and prerequisites, when Staff confirms the transition, then only status/transition metadata/version change and the resulting label is shown. |
| AC-19 | Given each omitted status pair, missing confirmation/reason/owner or stale version, when transition is attempted, then the documented error results and no ticket field changes. |
| AC-20 | Given an authorized ticket participant, when listing/creating Public Comments, then trimmed valid plain text appears chronologically with safe author/time; invalid input and cross-owner requests fail. |
| AC-21 | Given Staff/Admin, when listing/creating Internal Notes, then valid text persists only in the internal channel; invalid text fails and Requester/public payloads contain no note content. |
| AC-22 | Given the owning Requester, when setting or clearing Problem Appears Resolved, then only indicator/version/update time change and all ticket viewers see it separately from formal status. |
| AC-23 | Given Admin, when listing/searching/filtering or creating a valid single-role user, then matching safe user records or one new must-change account result; duplicate normalized emails fail. |
| AC-24 | Given Admin, when editing basic info/role/active state, then valid changes persist, role/activity changes revoke sessions, deactivation retains history, and forbidden ownership role changes fail. |
| AC-25 | Given Admin, when self-deactivating/self-demoting or concurrently removing remaining active Admin access, then the request is rejected and at least one active Admin remains. |
| AC-26 | Given Admin, when setting a confirmed new initial password, then target sessions are revoked, mustChangePassword is true, activity is unchanged, and password/hash is absent from responses. |
| AC-27 | Given a Lab 2 database and files, when migration and repeated seeding run, then IDs, ticket/attachment content, ownership and inactive flags are preserved; collision/orphan preflight fails safely; migrated login exposes only owned history and the selector endpoint no longer lists identities; IT Priority is backfilled from Requested Priority and development seeds meet the Staff counts and ticket distribution in §7. |
| AC-28 | Given missing sessions, forbidden roles, invalid input, missing resources, conflicts and injected failures, when each applicable endpoint is exercised, then it returns the documented safe status/body without secrets or partial writes. |
| AC-29 | Given every required screen/state at desktop/tablet/mobile widths, when used, then Zen Green styling, readable layout and all permitted actions remain available without horizontal overflow. |
| AC-30 | Given keyboard, assistive technology and enlarged text, when operating forms/dialogs/navigation, then labels, errors, focus, status announcements and non-color cues are usable. |

## 10. Definition of Done

- [ ] Human review approves these four mutually consistent contracts and decisions before implementation completion is claimed.
- [ ] Every FR/BR/AC is implemented and its planned automated coverage executed; no required test is silently skipped.
- [ ] Authentication gates and server permissions pass direct API bypass tests for all three roles, inactive users and restricted sessions.
- [ ] Every status pair is tested with permitted and forbidden roles, including races and failed preconditions.
- [ ] Migration rehearsal on a populated Lab 2 copy preserves ownership/data/files; repeat seeding and rollback/preflight evidence are reviewed.
- [ ] Requester ticket/attachment regression assertions remain, replacing only selector/header fixtures with real login; selector tests are retired deliberately.
- [ ] Unit, integration, UI, responsive, accessibility and E2E tests in tests.md run with an isolated database and test file storage.
- [ ] Existing `bun run verify` succeeds after implementation; report commands/environment/results, not assumed passes.
- [ ] Screens and all applicable feedback states are visually reviewed at 1280×900, 820×900 and 390×844, plus 320px and 200% text checks.
- [ ] No excluded feature, credential exposure, unauthorized note serialization, or undocumented endpoint divergence remains.

## 11. Assumptions and Decisions

1. Repository baseline is `docs/lab02/`, `server/prisma/schema.prisma`, `server/src/app.ts` and Requester screens in `client/src/lab02/`. The requested hyphenated Lab 2 directory does not exist. Per the updated request, this contract lives in `docs/lab03/`, matching `docs/lab02/`. The existing api-spec.md and tests.md were empty placeholders and are filled by this task. Planned test directories also use lab03. IDs here are Sprint 3-local, not Lab 2 IDs.
2. Choose opaque server-side sessions, not JWT. Cookie `toktickit_session`: HttpOnly, SameSite=Lax, Path=/, no Domain, Secure in deployed HTTPS; local HTTP development may omit Secure. Idle expiry 30 minutes and absolute expiry 8 hours. Rotate token on login/password change. Use at least 256 random bits and store only its hash. No browser localStorage credentials. Same-origin frontend/API via proxy is the deployment contract.
3. Choose Argon2id with per-password random 16-byte salt, 64 MiB memory, three iterations, parallelism 1, 32-byte output; store encoded parameters/hash. These are project implementation choices, not claims of an external compliance standard. Never log passwords/cookies/CSRF tokens. Compare a dummy hash for unknown/inactive login to avoid obvious account timing distinctions.
4. CSRF uses a session-bound token returned at login/current-user/password change; send `X-CSRF-Token` on authenticated mutations. Require trusted exact Origin on all browser mutations, including login/logout; no wildcard credentialed CORS. Logout without a valid session remains idempotent but still requires trusted Origin.
5. Administrators have queue/detail/comment/note access to satisfy visibility needs, and may update IT Priority in accordance with the peer-provided Lab 3 §4.5 correction; assignment and status mutations remain exclusive to IT_STAFF. Administrators cannot create tickets or mutate Requester attachments. There is no role switching or multi-role account.
6. Requesters cannot formally cancel/reopen tickets; they use Public Comments to request action. Closed/Cancelled are terminal; only Resolved can be reopened. The resolution indicator is reversible and informational. Review these workflow choices before approval.
7. Preserve Lab 2 page sizes 10/20/50 and single-sort behavior. Add a simple optional filter to new lists; no multi-sort/query-builder work. Comment/note lists are unpaginated for this lab. Queue totalItems is the only required simple count.
8. Version checks apply to the four mutable workflow fields; comment/note/attachment creation does not change workflow version. Admin edits lock/revalidate database state in a transaction; no separate admin optimistic-version feature.
9. Preserve Lab 2 UTF-16 string-length behavior for ticket/removal fields for compatibility; new name/password/comment/reason fields use Unicode code points as specified. Existing created-response code selects raw attachments on replay; the future implementation must project safe metadata consistently instead of preserving that storageKey leak. Legacy requester-list response wrapping is irrelevant because that endpoint is removed.
