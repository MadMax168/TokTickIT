# Lab 4 Test DD
All tests are planned; Final remains `Planned`.

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | FR-02, BR-04/05 | Field/follow-up validation | Valid passes; invalid rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-01 | API/integration | AC-01 | Create and server actor | 201 under correct Ticket/actor | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API/integration | AC-03/05 | List/update/roles/ownership/assignee | Requester read-only; staff update; invalid assignee rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API/integration | AC-03, BR-10 | Duplicate/stale update | Safe retry; stale 409 | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API/integration | AC-04 | Full transition matrix/terminal states | Only permitted transitions succeed | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-05 | API/integration | AC-04 | Resolution gate/owner/reason | Safe 400/409 rejection | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-06 | API/integration | AC-03 | 401/403/404/500 safe failures | Safe format, no mutation | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API/integration | AC-02 | Requester metrics/ownership | Only requester data, exact metrics | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-08 | API/integration | AC-06 | Staff/Admin metrics/drill-down | Exact aggregates, max 5, links | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-09 | API/integration | BR-12 | Asia/Bangkok boundaries/empty | Correct boundary and zero behavior | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| UI-01 | UI component | AC-05 | Actions list/create/edit/read-only/assignee | Required modes, active-assignee selection, rejection, stable order | `client/src/lab04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI component | AC-04 | Status controls/confirmation | Permitted controls and refresh | `client/src/lab04/TicketWorkflow.test.tsx` | Planned |
| UI-03 | UI component | AC-02/06 | Dashboard cards/drill-down | Exact cards/routes | `client/src/lab04/RequesterDashboard.test.tsx`; `client/src/lab04/StaffDashboard.test.tsx` | Planned |
| UI-04 | UI style | AC-07 | Zen Green/focus/labels/non-color | Checklist passes | `client/src/lab04/StaffDashboard.test.tsx` | Planned |
| UI-05 | Responsive | AC-07 | Desktop/tablet/mobile | No clipping/scroll | `client/src/lab04/RequesterDashboard.test.tsx` | Planned |
| UI-06 | UI component | AC-03/07 | Loading/empty/forbidden/conflict/not-found/failure | Correct recovery and retained input | `client/src/lab04/ActionsTaken.test.tsx` | Planned |
| AUTH-01 | Authorization | AC-03/05 | Ownership and role bypass | Backend rejects bypass | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| MIG-01 | Migration/regression | AC-08 | Legacy data/zero-action Ticket | Existing data preserved | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| MIG-02 | Migration/regression | AC-08 | Idempotent seed/status/priority/assignee fixtures | Repeat safe, active/inactive assignee cases present | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| PERF-01 | Performance-smoke | AC-06 | Dashboard aggregate smoke | Within agreed threshold | `server/tests/lab-04/requester-dashboard.api.test.ts`; `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| E2E-01 | E2E | AC-01/05 | Actions create/list/edit | Staff changes; requester reads | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-04 | Resolution workflow | Allowed/rejected paths work | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-02/06/07 | Dashboards/drill-down/responsive | Role-scoped cards/links | `e2e/lab-04/dashboards.spec.ts` | Planned |
| REG-01 | Migration/regression | AC-08 | Complete Lab 1-3 regression | Auth, tickets, attachments, comments, notes, admin pass | `server/tests/lab-04/ticket-workflow.api.test.ts`; `e2e/lab-04/dashboards.spec.ts` | Planned |

## Acceptance traceability
| AC | Test IDs |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-07, UI-03, E2E-03 |
| AC-03 | API-02, API-03, API-06, AUTH-01, UI-06 |
| AC-04 | API-04, API-05, UI-02, E2E-02 |
| AC-05 | API-01, API-02, UI-01, E2E-01 |
| AC-06 | API-08, API-09, UI-03, E2E-03, PERF-01 |
| AC-07 | UI-04, UI-05, UI-06, E2E-03 |
| AC-08 | MIG-01, MIG-02, REG-01 |

FR traceability: FR-01/02 UNIT-01, API-01/02, UI-01, E2E-01; FR-03 API-04/05, UI-02, E2E-02; FR-04 API-07/08/09, UI-03, E2E-03; FR-05 UI-01/02/03; FR-06 API-03/06, AUTH-01, UI-04/05/06, REG-01. BR traceability: BR-01/02 API-01/02; BR-03/04/05 UNIT-01/API-02; BR-06/07 API-01/02, AUTH-01; BR-08/09 API-05; BR-10 API-02/UI-01/E2E-01; BR-11 API-03; BR-12/13 API-07/08/09.
