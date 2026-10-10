# Lab 4 API Contract

All endpoints use the existing session cookie and X-CSRF-Token for writes. Errors are `{ "error": { "code": string, "message": string } }` with no stack traces. 401 unauthenticated, 403 forbidden, 404 missing/inaccessible, 409 conflict/stale/workflow, 400 or 422 invalid input. Every write is backend-enforced.

## Actions Taken
Shape: `{ id, ticketId, actionDateTime, actionDescription, result, performedBy: { id, name, role }, assignee: { id, name, role, active }, followUpRequired, followUpNote, attachmentNotes, createdAt, updatedAt, version }` with ISO dates.

| Method/path | Request | Success | Authorization |
|---|---|---|---|
| GET `/api/tickets/:ticketId/actions-taken` | optional limit 1-100 | 200 `{ items }`, actionDateTime ASC,id ASC | Requester owns Ticket; staff/admin accessible |
| POST `/api/tickets/:ticketId/actions-taken` | listed fields plus required `assigneeId`, except performedBy | 201 ActionTaken; server actor | IT Staff/Admin |
| PATCH `/api/tickets/:ticketId/actions-taken/:actionId` | editable fields, required `assigneeId`, plus version | 200 ActionTaken; increments version | IT Staff/Admin accessible |

Reject unknown fields, bad ISO, empty/overlong text, bad follow-up note, wrong relationship, missing/non-integer assigneeId, inactive/non-support assignee, and invalid version. Suggested limits: description/result 1-4000, notes 0-2000. Idempotency-Key or clientRequestId makes POST retries safe; same key/different body is 409 IDEMPOTENCY_KEY_REUSED. Stale version is 409 TICKET_VERSION_CONFLICT; invalid assignee is 409 ASSIGNEE_UNAVAILABLE.

## Ticket status
PATCH `/api/tickets/:ticketId/status` request `{ currentStatus, version, confirmed: true, reason? }`; 200 returns existing Ticket detail with incremented version. IT Staff/Admin only. Enforce the specification matrix, active owner for IN_PROGRESS/RESOLVED, and 3-200 character reason for RESOLVED/CLOSED/CANCELLED. Invalid transitions and stale versions are 409; validation is 400/422.

## Dashboards
GET `/api/requester/dashboard` (Requester only) returns `{ metrics: { totalOpen, waitingForRequester, recentlyUpdated, recentlyResolved }, recentUpdatedItems, recentResolvedItems, generatedAt }` and never accepts another requester id.

GET `/api/staff/dashboard` (IT Staff/Admin) returns `{ metrics: { unassigned, ownedByCurrentUser, byStatus, byPriority, recentlyUpdated }, recentItems, generatedAt }`; Admin reuses it. Responses are concise aggregates, not full Ticket collections, with at most five recent items. Empty results are zero/empty arrays. Drill-down links use `/tickets/:ticketId`, `/tickets?currentStatus=...`, `/tickets?assignedToId=unassigned`, `/tickets?assignedToId=<id>`, `/tickets?itPriority=...`, and `/tickets?updatedSince=<ISO>`. Dashboard failure is safe 500 DASHBOARD_FAILED.

## Unchanged APIs
All approved Lab 2-3 APIs continue unchanged: auth, ticket create/list/detail, comments, resolution indicator, attachments, staff queue/assignees, assignment, IT priority, internal notes, and admin users.
