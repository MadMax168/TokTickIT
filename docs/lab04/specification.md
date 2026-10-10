# Sprint 4 Engineering Contract

## 1. Sprint Goal
Deliver reliable Actions Taken history, enforced Ticket workflow, role-scoped dashboards, and Lab 1-3 regression without changing approved earlier behavior.

## 2. Stakeholder Request
Support staff need auditable work history, safe status progression, and operational summaries. Requesters need a private summary of their Tickets and attention items. Administrators need the staff view plus existing administration.

## 3. Scope
Included: Actions Taken; staff create/update and requester read access; workflow enforcement; Requester, IT Staff, and Administrator dashboards; drill-down; validation, authorization, concurrency, responsive/accessibility behavior, migration/seed/test documentation, and regression.

Excluded: SLA clocks/escalation/on-call; external notifications; inventory/spare parts/costing; timesheets/payroll; multi-level approval/e-signature; BI/report builders/exports; multi-tenant/cloud ops; any unapproved feature.

## 4. Functional Requirements
- **FR-01:** IT Staff/Admin create and update Actions Taken on accessible Tickets; Requesters read Actions Taken on their own Tickets.
- **FR-02:** Action Taken has actionDateTime, actionDescription, result, server-owned performedBy, approved assignee, followUpRequired, followUpNote, and attachmentNotes.
- **FR-03:** Backend enforces the transition matrix, resolution gate, active-owner rule, reason validation, version checks, and terminal behavior.
- **FR-04:** Backend dashboards return concise role-scoped aggregates and recent/attention items with drill-down.
- **FR-05:** Ticket Detail supports Actions Taken list/create/edit modes; navigation includes role dashboards; status controls show permitted transitions.
- **FR-06:** Backend authorization, duplicate/stale handling, safe failures, accessibility, responsive behavior, and Lab 1-3 regression are verified.

### Ticket status-transition matrix
| From / To | New | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|---|
| New | - | IT Staff/Admin | - | - | - | - | - | IT Staff/Admin |
| Open | - | - | IT Staff/Admin | IT Staff/Admin | - | - | - | IT Staff/Admin |
| In Progress | - | - | - | IT Staff/Admin | IT Staff/Admin | - | - | IT Staff/Admin |
| Waiting for Requester | - | - | IT Staff/Admin | - | IT Staff/Admin | - | - | IT Staff/Admin |
| Resolved | - | - | - | - | - | IT Staff/Admin | IT Staff/Admin | - |
| Closed | - | - | - | - | - | - | - | - |
| Reopened | - | IT Staff/Admin | IT Staff/Admin | - | - | - | - | IT Staff/Admin |
| Cancelled | - | - | - | - | - | - | - | - |

### Actions Taken authorization
| Role | Read | Create | Update | Delete |
|---|---|---|---|---|
| Requester | Own Tickets only | No | No | No |
| IT Staff | Accessible Tickets | Yes | Yes | No hard delete |
| Administrator | Staff behavior plus admin access | Yes | Yes | No hard delete |

Every write is enforced by the backend.

## 5. Business Rules
- **BR-01:** Action Taken belongs to exactly one Ticket.
- **BR-02:** Ticket Owner coordinates, but an Action Taken may be by a different IT Staff member.
- **BR-03:** actionDateTime is required, stored UTC; dashboards use Asia/Bangkok boundaries.
- **BR-04:** actionDescription and result are required non-empty text; attachmentNotes is optional.
- **BR-05:** followUpNote is required when follow-up is required and empty when it is not.
- **BR-06:** performedBy is set by the server from authenticated IT Staff/Admin and cannot be client-supplied; assigneeId identifies the approved active IT Staff/Admin responsible for the Action Taken.
- **BR-07:** assigneeId is required, must reference an active IT Staff/Admin, and is rejected when the target user is inactive or has another role.
- **BR-08:** Only the matrix is valid; IN_PROGRESS/RESOLVED require active assignedTo IT Staff/Admin; RESOLVED/CLOSED/CANCELLED require a 3-200 character reason.
- **BR-09:** Requester resolved-indication is advisory only and never changes status.
- **BR-10:** Actions Taken are append-only in stable actionDateTime ASC, id ASC order; edits do not reorder and hard delete is forbidden.
- **BR-11:** Writes check integer version; success increments it; stale writes return 409.
- **BR-12:** Open means OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, or REOPENED; dashboard queries are authoritative and role-scoped.
- **BR-13:** Recent windows use Asia/Bangkok, inclusive start/exclusive end; zero results return zero/empty arrays.

## 6. UI Specification Summary
See [ui-spec.md](ui-spec.md) for dashboards, Ticket Detail modes, transition controls, navigation, states, responsive rules, accessibility, Zen Green reuse, and obsolete UI removal.

## 7. Data Changes
Proposed ActionTaken fields: id Int, ticketId Int, actionDateTime DateTime, actionDescription String, result String, performedById Int, assigneeId Int, followUpRequired Boolean, followUpNote String?, attachmentNotes String?, createdAt DateTime, updatedAt DateTime, version Int. Add restrictive FKs to Ticket and User, Ticket.actionsTaken, User.performedActions, and indexes (ticketId, actionDateTime, id), (assigneeId, actionDateTime, id), plus dashboard indexes. Migration preserves all existing data; legacy Tickets remain valid with zero Actions Taken and need no backfill. Recovery is backup restore or forward fix, never destructive deletion. Idempotent seed covers every status/priority, assigned/unassigned, zero/one/many Actions Taken, active and inactive-assignee rejection, and zero/non-zero metrics. A child table preserves one-to-many history; server actor and approved assignee are auditable; ordering/version indexes support stable history and concurrency.

## 8. API Contract
See [api-spec.md](api-spec.md) for exact endpoints, shapes, validation, roles, errors, conflicts, idempotency, and unchanged Lab 2-3 APIs.

## 9. Acceptance Criteria
- **AC-01:** A permitted IT Staff user creating valid data saves an Action Taken under the correct Ticket with authenticated performedBy, the approved active assignee, and the listed fields.
- **AC-02:** An authenticated Requester receives only metrics and recent Tickets owned by that Requester.
- **AC-03:** Invalid, unauthorized, inaccessible, duplicate, and stale writes safely fail without mutation.
- **AC-04:** Permitted workflow transitions succeed only with owner/reason/version checks; invalid and terminal writes fail.
- **AC-05:** Actions Taken support stable list, staff edit, approved-assignee selection/rejection, requester read-only view, follow-up validation, and no hard delete.
- **AC-06:** Staff/Admin dashboards calculate specified metrics, concise aggregates, and correct drill-down.
- **AC-07:** UI states, accessibility, responsive layouts, and role navigation work on desktop/tablet/mobile.
- **AC-08:** Migration, seed, and complete Lab 1-3 regression preserve data and behavior.

## 10. Definition of Done
- [ ] Six documents reviewed together; names, paths, roles, fields, and responses match source.
- [ ] Authorization, CSRF, validation, safe errors, idempotency, and stale versions verified.
- [ ] Action, workflow, dashboard, drill-down, accessibility, responsive, migration, hardening, and regression tests pass.
- [ ] Seed is repeatable and demonstrates required cases; no broken links, placeholders, duplicates, console errors, or horizontal overflow.
- [ ] README/setup/seed/migration/test instructions are current and reviewer approval is recorded.

## 11. Assumptions and Decisions
**Confirmed handout requirements:** listed Action Taken fields/roles, eight statuses, dashboard categories, backend authorization, migration preservation, idempotent seed, safe failures, and regression.

**Resolved assignment decision:** Action Taken includes required assigneeId, distinct from server-owned performedById. It must reference an active IT Staff/Admin; inactive or non-support users are rejected. This resolves the handout’s AC-01 and Part 6 requirement.

**Proposed, pending student review:** integer version checked on update with 409 stale response; Asia/Bangkok dashboards with last 7 days/max 5/updatedAt DESC,id DESC; Actions Taken stable append-only ordering, editable by matrix, no hard delete. **Inferred:** UTC persistence, REST under /api, 3-200 character terminal reason, active-owner gate for In Progress/Resolved, and the matrix above.
