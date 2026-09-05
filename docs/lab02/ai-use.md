# AI-use record — Lab 2

## Tool used

Codex was used as an AI coding agent for planning, implementation, test design, debugging, documentation, and review-response drafting. The author retained responsibility for the contract decisions, code review, commits, and Pull Request actions.

## Key prompts and outcomes

| Issue / stage | Prompt actually used | Outcome |
| --- | --- | --- |
| Contract | “Create these four files … `docs/lab02/specification.md`, `api-spec.md`, `tests.md`, and `ui-spec.md`.” | Produced the Lab 2 engineering contract and test-plan structure from the labsheet. |
| Review of contract | “requires FR-01–FR-19, BR-01–BR-26, and AC-01–AC-24 with full traceability.” | Expanded the contract identifiers and AC-to-test traceability. |
| Database | “Issue #2 — Database schema and seed data.” | Added the Lab 2 Prisma schema, migration/seed design, and idempotent seed testing. |
| Requester context | “Issue #3 — Development Requester selection context (API + selector screen).” | Implemented the active Requester selector, testing context, and supporting UI/API tests. |
| Ticket creation | “Issue #4 — Ticket creation API.” | Added documented ticket validation, number generation, idempotency behavior, and API tests. |
| Create Ticket UI | “write the failing UI test … then implement the form, reference loading, validation/focus, busy/retry states, POST submission…” | Implemented and tested the requester-facing ticket form. |
| Attachments | “Implement this behind a storage adapter interface … rather than calling `fs` directly from the attachment route handlers.” | Added a replaceable local attachment-storage boundary and attachment lifecycle coverage. |
| Ticket list/detail | “My Tickets still shows Open Ticket as a disabled button … wire the row action to this screen.” | Connected My Tickets to Requester Ticket Detail and added a navigation regression test. |
| Final QA | “Issue #9 — Zen Green visual QA, E2E tests, and release integration.” | Added root verification orchestration and real-stack Playwright E2E coverage; visual QA remains in progress. |

## My Reflection

Codex made it faster to turn the labsheet into a detailed contract and to keep feature work tied to requirement IDs and planned tests. The most useful pattern was reviewing small, test-first changes and using real review comments to find gaps such as missing navigation and context handling. I still needed to verify generated changes, resolve environment problems such as database access, make final product decisions, and perform the peer-review and merge steps myself. The AI was a collaborator and drafting tool, not a replacement for validation or ownership of the submission.
