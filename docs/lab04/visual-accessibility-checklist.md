# Lab 4 Visual and Accessibility Checklist

Verification date: 2026-10-27. Automated client tests and builds were run locally. Browser-level accessibility and responsive checks are marked **NOT VERIFIED** where Playwright evidence was unavailable or the corresponding Lab 4 E2E file does not yet exist.

| Check | Screen | Result | Evidence/notes |
|---|---|---|---|
| Zen Green tokens and shared visual language | Requester Dashboard | NOT VERIFIED | Static CSS review only; no screenshot captured. |
| Zen Green tokens and shared visual language | IT Staff Dashboard | NOT VERIFIED | Static CSS review only; no screenshot captured. |
| Actions list, create/edit modes | Staff Ticket Detail / Actions Taken | PASS | `ActionsTaken.test.tsx` passed; edit hydration is covered. |
| Requester read-only Actions Taken | Requester Ticket Detail | PASS | Read-only component test passed. |
| Status controls expose permitted transitions | Staff Ticket Detail | PASS | `TicketWorkflow.test.tsx` passed. |
| Validation messages are associated with controls | Lab 4 forms | NOT VERIFIED | No automated axe/Playwright assertion is present. |
| Visible keyboard focus | Lab 4 screens | NOT VERIFIED | Requires browser keyboard walkthrough. |
| Semantic labels and headings | Lab 4 screens | NOT VERIFIED | Requires browser accessibility scan. |
| Status/priority meaning is not color-only | Dashboards and Ticket Detail | NOT VERIFIED | Requires rendered browser inspection. |
| Accessible dialogs and focus restoration | Admin User Management | NOT VERIFIED | No browser dialog test is present. |
| Desktop layout at 1280x900 | Dashboards, Ticket Detail | NOT VERIFIED | Playwright Lab 4 screenshot run is unavailable. |
| Tablet layout at 820x900 | Dashboards, Ticket Detail | NOT VERIFIED | Playwright Lab 4 screenshot run is unavailable. |
| Mobile layout at 390x844 | Dashboards, Ticket Detail | NOT VERIFIED | Playwright Lab 4 screenshot run is unavailable. |
| 320px width and 200% text | All major screens | NOT VERIFIED | Not exercised in the current run. |
| No clipping, overlap, or horizontal scroll | All major screens | NOT VERIFIED | Requires browser viewport checks. |
| Loading, empty, forbidden, conflict, not-found, safe failure states | Lab 4 screens | NOT VERIFIED | Component tests cover only a subset of these states. |

## Evidence limitations

The repository currently has no `e2e/lab04/` specs or Lab 4 screenshot artifacts. The configured Playwright global setup also depends on Docker and the complete server regression suite contains legacy Lab 2 tests that still use the retired development-requester header flow. These items remain open for human review and must not be represented as passing evidence.
