# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned before implementation and cover unit, API/integration, UI component, style, responsive, visual, and E2E levels. Each test is automated unless marked visual; visual tests use Playwright screenshots plus the checklist in `ui-spec.md`. “Planned” is the pre-implementation result.

## 2. Planned tests

| ID | Level | AC | What it tests / expected result | Planned file | Result |
| --- | --- | --- | --- | --- | --- |
| UNIT-01 | Unit | AC-03, AC-20 | Ticket suffix format/alphabet and uniqueness retry behavior | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| UNIT-02 | Unit | AC-04, AC-19 | Trimmed summary/description boundaries and priority validation | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| UNIT-03 | Unit | AC-11, AC-12 | File extension/MIME, 5 MiB, and five-active-attachment rules | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-01 | API/integration | AC-01, AC-15, AC-17 | Active requester endpoint excludes inactive; selector-safe error contract | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-02 | API/integration | AC-03, AC-04 | Valid create is 201; invalid fields are 400 and no row saves | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| API-03 | API/integration | AC-06, AC-10 | Cross-requester list/detail is non-disclosing 404 | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-04 | API/integration | AC-07, AC-21 | Search/filter/sort/page applies only to owner; valid empty pages preserve metadata and malformed parameters are rejected | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-05 | API/integration | AC-08 | Empty owner and valid no-match query both return `items: []`, `totalItems: 0`, and normal pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| API-06 | API/integration | AC-09, AC-22 | Owned detail returns read-only ticket fields, active/removed attachment metadata, and safe relative download URLs | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-07 | API/integration | AC-11, AC-12 | Upload allowed file; reject type/size/cap without damaging saved ticket | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-08 | API/integration | AC-13, AC-22, AC-23 | Confirmed removal retains metadata and blocks download; invalid/unowned/already-removed requests are safe | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| API-09 | API/integration | AC-18, AC-24 | Active reference-data-only responses and safe unexpected-error envelope | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| UI-01 | UI component | AC-01, AC-02, AC-14, AC-17 | Selector gate, loading/empty/failure, continue/cancel, and requester switch clear/reload state | `client/src/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-02 | UI component | AC-03, AC-04, AC-05, AC-18, AC-19, AC-24 | Create success, reference/read-only states, field errors, preserved values, disabled busy submit, and retryable failure | `client/src/lab-02/CreateTicket.test.tsx` | Planned |
| UI-03 | UI component | AC-07, AC-08 | Query controls, list results, empty-list versus no-results copy from same API shape | `client/src/lab-02/MyTickets.test.tsx` | Planned |
| UI-04 | UI component | AC-09, AC-10 | Owned read-only detail and safe not-found state | `client/src/lab-02/RequesterTicketDetail.test.tsx` | Planned |
| UI-05 | UI component | AC-11, AC-12, AC-13 | Attachment queued/invalid/uploaded/removed/unavailable behavior | `client/src/lab-02/AttachmentSection.test.tsx` | Planned |
| STYLE-01 | UI style | AC-04, AC-16 | Tokens, labels, asterisks, field-local messages, focus/disabled/busy classes | `client/src/lab-02/CreateTicket.style.test.tsx` | Planned |
| STYLE-02 | UI style | AC-16 | Zen Green shell, readable badges, read-only distinction, accessible icon labels | `client/src/lab-02/MyTickets.style.test.tsx` | Planned |
| RESP-01 | Responsive | AC-16 | Desktop/tablet/mobile Create Ticket: no overflow or clipped controls | `client/src/lab-02/CreateTicket.responsive.test.tsx` | Planned |
| RESP-02 | Responsive | AC-16 | Table/card, filters, pagination, detail attachment names at three widths | `client/src/lab-02/MyTickets.responsive.test.tsx` | Planned |
| VIS-01 | Visual | AC-16 | Screenshot comparison/checklist for initial, validation, busy, success, and failure Create Ticket | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| VIS-02 | Visual | AC-08, AC-13, AC-16 | Screenshot/checklist for list states and active/removed attachments at three widths | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-01 | E2E | AC-01, AC-03, AC-07, AC-09 | Select requester, create ticket, find it, and open detail | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-06, AC-10, AC-14 | Switch from A to B; A data disappears and direct access is rejected | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-11, AC-12, AC-13, AC-15 | Attachment lifecycle plus invalid upload and safe failure/retry state | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Test coverage by level

The planned-test table includes all required levels: unit (`UNIT-*`), API/integration (`API-*`), UI component (`UI-*`), UI style (`STYLE-*`), responsive (`RESP-*`), visual (`VIS-*`), and E2E (`E2E-*`).

## 4. Acceptance-criterion traceability

| AC | Planned tests |
| --- | --- |
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | UI-01 |
| AC-03 | UNIT-01, API-02, UI-02, E2E-01 |
| AC-04 | UNIT-02, API-02, UI-02 |
| AC-05 | UI-02 |
| AC-06 | API-03, E2E-02 |
| AC-07 | API-04, UI-03, E2E-01 |
| AC-08 | API-05, UI-03, VIS-02 |
| AC-09 | API-06, UI-04, E2E-01 |
| AC-10 | API-03, UI-04, E2E-02 |
| AC-11 | UNIT-03, API-07, UI-05, E2E-03 |
| AC-12 | UNIT-03, API-07, UI-05, E2E-03 |
| AC-13 | API-08, UI-05, VIS-02, E2E-03 |
| AC-14 | UI-01, E2E-02 |
| AC-15 | API-01, E2E-03 |
| AC-16 | STYLE-01, STYLE-02, RESP-01, RESP-02, VIS-01, VIS-02 |
| AC-17 | API-01, UI-01 |
| AC-18 | API-09, UI-02 |
| AC-19 | UNIT-02, UI-02 |
| AC-20 | UNIT-01 |
| AC-21 | API-04 |
| AC-22 | API-06, API-08 |
| AC-23 | API-08 |
| AC-24 | API-09, UI-02, E2E-03 |

## 5. Responsive and visual checklist

Run the `ui-spec.md` visual checklist using screenshots in `artifacts/lab-02/screenshots/create-ticket/`, `artifacts/lab-02/screenshots/my-tickets/`, and `artifacts/lab-02/screenshots/ticket-detail/` at >=992px, 768-991px, and <768px. Record pass/fail and corrective evidence before final delivery.

## 6. Test Commands

Document the repository's final server, client, and Playwright commands in README before completion. The final run must execute the planned files above from `main` without skipped tests.

## 7. Final Results

Pending implementation. Replace each “Planned” result with the final command evidence and pass status; do not reconstruct this plan after implementation.

## 8. Known Limitations or Deferred Tests

Real authentication/authorization, IT Staff workflows, collaboration, Actions Taken, and status transitions are intentionally deferred because they are outside Lab 2.
