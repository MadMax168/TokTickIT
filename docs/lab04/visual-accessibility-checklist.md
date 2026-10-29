# Lab 4 Visual and Accessibility Checklist

Verification date: 2026-10-29. Client tests and the Lab 4 Playwright suite were run. Screenshots are committed under `artifacts/lab04/screenshots/`.

| Check | Screen | Result | Evidence/notes |
|---|---|---|---|
| Zen Green tokens and shared visual language | Requester Dashboard | PASS | Client tests and desktop/tablet/mobile screenshots captured. |
| Zen Green tokens and shared visual language | IT Staff Dashboard | PASS | Client tests and desktop/tablet/mobile screenshots captured. |
| Actions list, create/edit modes | Staff Ticket Detail / Actions Taken | PASS | `ActionsTaken.test.tsx` passed; edit hydration is covered. |
| Requester read-only Actions Taken | Requester Ticket Detail | PASS | Read-only component test passed. |
| Status controls expose permitted transitions | Staff Ticket Detail | PASS | `TicketWorkflow.test.tsx` passed. |
| Validation messages are associated with controls | Lab 4 forms | NOT VERIFIED | No automated axe/Playwright assertion is present. |
| Visible keyboard focus | Lab 4 screens | NOT VERIFIED | Requires browser keyboard walkthrough. |
| Semantic labels and headings | Lab 4 screens | NOT VERIFIED | Requires browser accessibility scan. |
| Status/priority meaning is not color-only | Dashboards and Ticket Detail | NOT VERIFIED | Requires rendered browser inspection. |
| Accessible dialogs and focus restoration | Admin User Management | NOT VERIFIED | No browser dialog test is present. |
| Desktop layout at 1280x900 | Dashboards, Ticket Detail | PASS | Playwright project passed; screenshots committed. |
| Tablet layout at 820x900 | Dashboards, Ticket Detail | PASS | Playwright project passed; screenshots committed. |
| Mobile layout at 390x844 | Dashboards, Ticket Detail | PASS | Playwright project passed; screenshots committed. |
| 320px width and 200% text | All major screens | NOT VERIFIED | Not exercised in the current run. |
| No clipping, overlap, or horizontal scroll | Lab 4 dashboards, Actions Taken, workflow | PASS | `noHorizontalScroll` passed in E2E flows at all three viewports. |
| Loading, empty, forbidden, conflict, not-found, safe failure states | Lab 4 screens | NOT VERIFIED | Component tests cover only a subset of these states. |

## Evidence limitations

Browser-level axe scanning, a dedicated keyboard walkthrough, 320px/200% text zoom, and modal focus restoration were not run; those rows remain `NOT VERIFIED`. The standalone server regression command also requires `LAB03_TEST_DATABASE_URL` and an isolated PostgreSQL instance; its unconfigured run is recorded as not run rather than passing.
