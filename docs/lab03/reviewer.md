# Peer Review — CPE334 Lab 3: TokTickIT

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
| Issue 2: Data Model, Migration & Authentication | https://github.com/MadMax168/TokTickIT/pull/36 | Approved |
| Issue 3: Requester Regression & Public Comments | https://github.com/MadMax168/TokTickIT/pull/37 | Approved |
| Issue 4: IT Staff Ticket Queue & Operations | https://github.com/MadMax168/TokTickIT/pull/38 | Approved |
| Issue 5: Administrator User Management | https://github.com/MadMax168/TokTickIT/pull/39 | Approved |
| Issue 6: Hardening, Testing & Release Integration | https://github.com/MadMax168/TokTickIT/pull/40 | Changes requested; release gate open |

---

## Review Comments I Received

### Issue 1
**Comment from peer:**
Request changes: Please align the contract with the Lab 3 sheet before approval. IT Priority must initially copy Requested Priority and be changeable by IT Staff or Administrators (§4.5), rather than starting as null and being Staff-only. The seed/test-fixture contract also needs at least three active and one inactive IT Staff account, plus realistic tickets distributed across requesters, statuses, priorities, and assigned/unassigned ownership (§5.3).

**My Response:**
Addressed both review requests:
IT Priority now initially copies Requested Priority and can be changed by IT Staff or Administrators. Updated API permissions, UI controls, migration backfill, acceptance criteria, and planned tests consistently.
Seeds now require at least three active and one inactive IT Staff account, plus a concrete 12-ticket distribution across Requesters, all eight statuses, all three priorities, and assigned/unassigned ownership.
Updated migration, seed, authorization, UI, and E2E test expectations. All tests remain Planned.
Please re-review the updated contracts.

**Comment from peer:**
Thanks for the update. I rechecked the latest contract against Issue #28 and the Lab 3 requirements sheet.

The previously reported corrections are now reflected:

IT Priority is initialized from Requested Priority and can be updated by IT Staff or Administrators.
The seed contract includes the required Staff counts and 12-ticket distribution.
Two contract gaps remain before Issue #28 can be approved:

Ticket-owner authorization — Lab 3 §4.5

The requirements define a primary Ticket Owner as an active IT Staff or Administrator user.
docs/lab03/specification.md BR-13, docs/lab03/api-spec.md EP-14/EP-15, and the API-14 test plan still restrict owner targets to active IT Staff.
Please align the authorization matrix, assignment API, UI behavior, and planned tests so the documented owner domain is consistent with §4.5.
Required seeded collaboration data — Lab 3 §5.3

The requirements also require safe example Public Comments and Internal Notes in the development seed.
The new seed section defines accounts and 12 Tickets, but it does not define seeded comments/notes or repeat-seed assertions for them.
Please add deterministic, non-sensitive examples and cover their preservation in the seed/migration test plan.
Once these two contract gaps are addressed, I can recheck the updated head.

**My Response:**
Addressed both remaining gaps:

Ticket Owner targets now include active IT Staff and Administrators. Updated BR-13, EP-14/EP-15, owner selectors/labels, status prerequisites, role-change rules, and planned tests consistently. Owner eligibility is explicitly distinguished from permission to perform assignment actions.
Added three deterministic Public Comments and two Internal Notes with safe example text, fixed authors/timestamps, and stable seed keys. Planned tests cover correct visibility, duplicate prevention, and preservation of IDs, content, references, and timestamps across seed reruns.
All 50 tests remain Planned. Please recheck the updated contracts for Issue #28.

**Comment from peer:**
Rechecked head d58e93a against Issue #28 and the Lab 3 requirements:

§4.5 ownership: Active IT Staff and Administrators are consistently supported as ticket owners across the business rules, API, UI, and planned tests.
§5.3 seed data: Safe deterministic Public Comments and Internal Notes are now specified, including stable identities, timestamps, visibility, duplicate prevention, and rerun preservation.
The previously reported IT Priority and seed-distribution gaps remain resolved.
No necessary blockers remain. This is okay to merge.

---

### Issue 2
**Comment from peer:**
Rechecked PR #36 at head 6d6cf0a against Issue #29 and the Lab 3 requirements.
The migration preserves the existing ticket and attachment data while adding the required User, session, ownership, priority, comment, and note structures.
Authentication, password-change gating, session invalidation, idempotent seed data, and the authenticated shell are covered by the implementation and committed verification evidence.
No necessary blockers remain for this issue.
This is okay to merge.


---

### Issue 3
**Comment from peer:**
Blocking findings

I reviewed PR #37 against Issue #30. The new requester workspace replaces the existing flow, but /tickets/new currently shows “Access unavailable” and attachment actions are not available to requesters. The required “Problem Appears Resolved” interaction is also missing. Please preserve these core requester flows while switching identity to the authenticated session.

I’m not blocking on the stale E2E route or the version increment edge case.

**My Response:**
Thanks for catching these gaps. I updated the authenticated Requester workspace to preserve the required Lab 2 flows while using session identity.

Fixed items:

/tickets/new now provides the complete Create Ticket form with category, related system, priority, summary, description, and optional attachment upload.
Ticket creation uses the authenticated session user on the server; no selector or client requester identity is trusted.
Requester Ticket Detail now displays attachment metadata and provides Download and Remove actions with a required removal reason.
Added the “Problem Appears Resolved” action to Ticket Detail.
The indicator uses the ticket version for optimistic concurrency and only updates the indicator field; it never changes formal ticket status.
Public Comment posting remains available with server-derived author and timestamp.
The legacy requester selector is still removed from the default application flow.

**Comment from peer:**
Rechecked PR #37 at 3a256dd. The previously reported requester-flow gaps are addressed: authenticated ticket creation, attachment actions, Public Comments, and the “Problem Appears Resolved” action are now present.

I found no remaining blocking issues under the agreed review scope. This PR is okay to merge.

---

### Issue 4
**Comment from peer:**
I reviewed PR #38 against Issue #31. The server endpoints are present, but StaffWorkspace is currently only a read-only queue table. It has no queue controls or open-detail flow, so claim/reassign, IT Priority, status transitions, Public Comments, Internal Notes, and attachments cannot be used through the UI.

Please wire the required Staff queue/detail workflow and add the Issue #31 regression tests before recheck.

**My Response:**
Thanks for the review. I updated the Staff workflow so the queue is now fully usable through the UI.

Fixes completed:

Added an Open action for every queue ticket.
Added Staff ticket detail view.
Added Claim and Reassign controls with active assignee options.
Added IT Priority update control.
Added status transition control using the server-side transition API.
Added Public Comment viewing and posting for Staff/Admin users.
Added Internal Notes viewing and posting with a visually separate section.
Added attachment metadata and download links to Staff ticket detail.
Preserved authenticated session identity and CSRF protection for all mutations.
Added a regression test covering queue loading, opening ticket detail, and the Staff comment/note actions.

**Comment from peer:**
Rechecked PR #38 at 141d62b. The previously reported Staff workflow gap is addressed: queue detail access, ownership, priority, status, Public Comments, Internal Notes, and attachments are now available.

No blocking issues remain under the agreed review scope. This PR is okay to merge.

---

### Issue 5
**Comment from peer:**
I reviewed PR #39 against Issue #32. Two blockers remain:

Password management is incomplete: there is no reset-password action in AdminWorkspace, and the create/reset APIs do not implement the required confirmed initial-password flow.
Admin safety is incomplete: self-deactivation is blocked, but an Administrator can still change their own role. This must also be rejected.
Please address these before recheck.

**My Response:**
Thanks for the review. I addressed both blockers.

Password management fixes:

Added a Reset password action to every user row in AdminWorkspace.
Added a dedicated reset-password form with password and confirmation fields.
Added confirmation validation for new user initial passwords.
Added confirmation validation for administrator password resets.
Both create and reset APIs reject missing or mismatched confirmations.
Password resets hash the new password, revoke existing sessions, and set mustChangePassword=true.
Administrator safety fixes:

Self-deactivation remains blocked.
Administrators can no longer change their own role.
The last active Administrator protection remains enforced server-side.
Validation completed:

Administrator user-management regression test passes.
Server production build passes.
Client production build passes.
git diff --check passes.

**Comment from peer:**
Rechecked PR #39 at d1bf54d. The previously reported password-management and administrator-safety issues are addressed.

No blocking issues remain under the agreed review scope. This PR is okay to merge.

---

### Issue 6
**Comment from peer:**

I reviewed PR #40 against Issue #33. The audit is transparent, but the release gate is still open: direct authorization, integrated E2E, migration, responsive/accessibility evidence, and planned test rows remain outstanding. `reviewer.md` also needs correction: PRs #38–#40 have incorrect issue labels, PR #40 is marked approved before review, and the Issue 6 section is blank. Please complete and correct the release evidence before merge.

**My Response:**

Corrected the Lab 3 reviewer record so PR #38 maps to Issue #31, PR #39 maps to Issue #32, and PR #40 maps to Issue #33. PR #40 is now recorded as changes requested/release gate open rather than approved. Added the Issue 6 review comment and response context, and documented the remaining release evidence gaps in `docs/lab03/issue06-release-audit.md`: direct authorization coverage, integrated E2E, authenticated migration access, responsive/accessibility evidence, and planned test reconciliation. No merge to `main` is claimed until those gates are completed and reviewed.

---
