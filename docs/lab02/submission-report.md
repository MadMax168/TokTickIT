# CPE 334 Lab 2 Submission Report

## Answer Part 1 — Git Use with Engineering Workflow

Lab 2 used a staged Git workflow to keep the requester ticketing MVP reviewable and integrable. Work progressed from `main` to `lab02-staging`, then through nine Issue-scoped feature branches. Each branch addressed one defined unit of work, was reviewed through a Pull Request, and was merged into `lab02-staging` only after peer review. The completed staging branch was then prepared for a single release Pull Request to `main`. This kept specification work, implementation work, review fixes, and final integration traceable in the repository history.

**Commit graph and merge history**

[SCREENSHOT: commit graph/history]

**Kanban workflow**

[SCREENSHOT: Kanban board, all Issues Done]

**Peer-review record**

[Rendered reviewer.md — paste as text here]

**Repository guidance and ignored local files**

[SCREENSHOT: README + .gitignore]

**Repository structure**

[SCREENSHOT: directory structure]

## Answer Part 2 — Spec DD

The team used specification-driven development before starting feature implementation. The four engineering-contract documents — `specification.md`, `api-spec.md`, `tests.md`, and `ui-spec.md` — defined scope, API behavior, data rules, test coverage, and UI requirements. During the approval cycle, Codex was asked to identify contract conflicts before coding rather than choosing an interpretation silently. Once the requirements, identifiers, and decisions were aligned, the documents were marked **approved for implementation** and became the source of truth for subsequent Issues.

**Specification excerpt: functional requirements, business rules, acceptance criteria, and Definition of Done**

[Rendered specification.md excerpt — numbered FR/BR/AC/DoD]

**Evidence that the contract was approved before implementation**

[SCREENSHOT: commit history showing spec approved before Issue #4's first implementation commit]

## Answer Part 3 — Test DD and Traceability

Testing was planned before implementation in `tests.md`. Each Issue was linked to relevant functional requirements, business rules, acceptance criteria, and named test files. The test plan includes an AC-to-test traceability matrix so that each acceptance criterion can be checked against planned unit, API, UI, responsive, visual, or end-to-end evidence. The development process followed test-driven development where applicable: a test was written to describe the required behavior, confirmed to fail for the expected reason, then used to guide the smallest implementation change.

**Planned tests and acceptance-criteria traceability**

[Rendered tests.md excerpt — planned-test table + traceability matrix]

**Integrated test evidence**

[SCREENSHOT: full passing test suite output from main]

## Answer Part 4 — AI Use with Reflection

### My Reflection

Working with Codex was most useful when it was treated as an agent that had to follow a written contract, not as a tool that could decide missing requirements by itself. Several times it stopped instead of continuing: when the contract files were missing or not yet approved, when the draft and canonical documents used conflicting FR, BR, and AC numbering, and when reviewer-history details were requested without a reliable source. At first, these stops felt slower than simply asking for an implementation. However, they prevented the project from building features against the wrong contract or adding invented claims to the submission record.

The process also showed that an AI saying a task is complete is not enough evidence. I needed to read the diffs, run tests, check the UI at different widths, and respond to peer-review comments. For example, peer review identified missing Ticket Detail navigation and an attachment-download context problem that were not acceptable until they were reproduced, tested, and fixed. I learned that responsible AI supervision means giving clear scope and acceptance criteria, checking what actually changed, and treating failures or uncertainty as information to investigate rather than something to hide. Codex helped organize and accelerate the work, but I remained responsible for the decisions, verification, commits, reviews, and final submission.

**Key AI prompts and outcomes**

[Table: 6-10 key prompts I used, with LLM used = Codex]

## Answer Part 5 — Development Requester Select Screen

The Development Requester Select Screen is included in the evidence for Part 6 because it establishes the requester testing context used by Create Ticket; it is not a login or authentication mechanism.

## Answer Part 6 — Working Ticket Screen: Create Mode

**Requester context and saved-ticket ownership**

The selected Development Requester is displayed in the Create Ticket screen and is sent to requester-scoped API operations through `X-Development-Requester-Id`. The saved Ticket uses this server-validated requester context rather than a requester ID supplied by the form.

[SCREENSHOT: Requester field populated from selection + matching requesterId in saved ticket]

**Create Ticket with active reference data**

The Create Ticket form loads active Categories and Related Systems from the API, alongside the required Requested Priority, Summary, and Description controls. Ticket Number and Ticket Date are read-only because they are generated by the server after creation.

[SCREENSHOT: Create Ticket desktop view with reference data loaded]

**Field-level validation**

An invalid submission shows messages beside the relevant required fields and prevents an invalid create request from being sent. Summary and Description are checked after trimming against their documented length ranges.

[SCREENSHOT: invalid submission with field-level errors]

**Attachment selection feedback**

The form accepts permitted attachment types and shows immediate feedback for invalid selections before upload. Attachments are uploaded separately after the Ticket is created, so an attachment problem does not remove an already saved Ticket.

[SCREENSHOT: valid + invalid attachment selection]

**Safe backend failure and retry state**

When ticket creation fails safely at the backend boundary, the form displays a clear error while preserving the entered values. This allows the Requester to correct the issue or retry without re-entering the ticket details.

[SCREENSHOT: simulated backend failure, safe error state, values preserved]

## Answer Part 7 — Working My Tickets Screen

**Requester-owned ticket list**

My Tickets is scoped to the selected Development Requester. The list contains only Tickets owned by that requester and provides identifying ticket information together with an Open Ticket action.

[SCREENSHOT: Requester A's ticket list]

**Requester switching and stale-data protection**

After changing from Requester A to Requester B, requester-specific list and detail state is cleared before B's data is loaded. Tickets that belong to A do not remain visible to B.

[SCREENSHOT: switched to Requester B, A's tickets gone]

**Search, filters, sorting, and pagination**

The list supports case-insensitive search over Ticket Number and Summary, filters for the documented Ticket fields, deterministic sorting, and one-based pagination. These controls are applied within the selected Requester's ownership scope.

[SCREENSHOT: search/filter/sort/pagination in use]

**Empty list compared with no results**

An owned empty list and a valid query with no matches use the same API response structure: an empty `items` array and zero totals. The UI distinguishes the two situations using whether search or filter controls are active, then presents the appropriate recovery action.

[SCREENSHOT: empty state vs no-results state side by side]

**Cross-requester protection**

Attempting to retrieve a Ticket belonging to another Requester is rejected with a non-disclosing `404`. The response does not reveal whether the Ticket exists or belongs to someone else.

[SCREENSHOT: cross-requester access attempt blocked]

## Answer Part 8 — Working Ticket Screen: View Mode and Attachments

**Owned Ticket Detail**

Ticket Detail displays the selected Requester's owned Ticket as read-only information: Ticket Number, date, requester, classification, requested priority, current status, summary, and description. Attachment controls are visually separated from the Ticket fields.

[SCREENSHOT: owned Ticket Detail]

**Attachment metadata after upload**

After a permitted upload succeeds, the attachment section displays safe metadata such as display name, MIME type, size, and upload time. Storage keys and local storage paths are never displayed.

[SCREENSHOT: attachment added]

**Active attachment download**

An active attachment can be downloaded only through an owned Ticket using the selected Requester's context header. The application downloads the file through the API rather than exposing the storage location.

[SCREENSHOT: active attachment downloaded]

**Soft removal with retained metadata**

Removal requires confirmation and a reason. The operation records `removedAt` and the reason while preserving the attachment metadata row for auditability; it does not delete the database record.

[SCREENSHOT: soft removal with reason, metadata retained]

**Blocked download after removal**

Once removed, the attachment remains visible as metadata but is marked Removed and no longer offers an active download action. This prevents removed content from being retrieved while retaining the removal explanation.

[SCREENSHOT: blocked download of removed attachment]

**Unauthorized Ticket access**

Ticket Detail applies the same ownership rule as My Tickets and attachment operations. A Requester cannot inspect a Ticket owned by another Requester, and the result is a non-disclosing not-found response.

[SCREENSHOT: unauthorized ticket access rejected]

## Answer Part 9 — Zen Green UI and Responsive Evidence

The interface uses the Lab 2 Zen Green design system: a consistent primary green, secondary interaction color, pale green surfaces, readable charcoal-green text, and explicit success, warning, and error text. Layout behavior is defined at three breakpoints: desktop at 992px and wider, tablet from 768px to 991px, and mobile below 768px. The responsive review checks that controls remain labeled, keyboard-accessible, and readable, with no hidden controls, clipping, overlap, or unintended horizontal page scrolling.

**Zen Green UI contract**

[Rendered ui-spec.md excerpt]

**Responsive screen evidence**

[SCREENSHOT: desktop/tablet/mobile x3 screens]

**Visual inspection checklist**

[Visual checklist — paste as text here]
