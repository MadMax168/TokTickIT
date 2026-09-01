# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a responsive, requester-facing TokTickIT MVP in which a temporarily selected Development Requester can create and find only their own IT support tickets, view a read-only ticket detail, and manage permitted attachments. This selection is a Lab 2 test context, not authentication.

## 2. Stakeholder Request

Provide a professional Zen Green ticketing experience: select a seeded active requester, describe and classify a support problem, attach evidence, receive an official ticket number, and later locate and inspect that requester-owned ticket. The experience must be safe, responsive, testable, and reusable by later screens without introducing Lab 3 authentication or IT Staff workflows.

## 3. Scope

### Included

- Development Requester selection, display, changing, and requester-scoped data reload.
- Create Ticket, My Tickets, requester-owned Ticket Detail, and active attachment addition, metadata, download, and soft removal.
- Reference-data loading, search, filters, sorting, pagination, validation, loading, failure, empty, and no-results states.
- Zen Green reusable UI conventions, data design, API contract, and planned test evidence.

### Excluded

- Login/logout, passwords, hashing, sessions, tokens, authenticated identities, or real authorization.
- IT Staff dashboards/queues, claiming/reassignment, or changing IT Priority.
- Public Comments, Internal Notes, Actions Taken, and collaboration/work tracking.
- Any status transition after the initial `NEW` status, including resolve, close, reopen, or cancel.
- Administration of users, requesters, roles, categories, or related systems.

## 4. Functional Requirements

- FR-01: The app shall require an active Development Requester selection before requester ticket screens are available and clearly label it as test-only.
- FR-02: The app shall load active Categories, Related Systems, and Development Requesters from PostgreSQL-backed APIs.
- FR-03: A selected Requester shall create one ticket with Category, Related System, Summary, Requested Priority, Description, and optional permitted attachments.
- FR-04: The backend shall generate and return a unique official Ticket Number and system values on successful ticket creation.
- FR-05: My Tickets shall return only tickets owned by the selected Requester, with search, filters, sorting, and pagination.
- FR-06: The requester shall retrieve a Ticket Detail only when the selected Requester owns that ticket.
- FR-07: The owner shall add a permitted attachment to an existing ticket, inspect attachment metadata, and download an active attachment.
- FR-08: The owner shall soft-remove an active attachment with confirmation and a removal reason; its metadata remains visible but preview/download is blocked.
- FR-09: Switching Requester shall clear requester-scoped view state and reload requester-specific ticket data.
- FR-10: The UI shall provide meaningful loading, validation, success, failure, empty-list, and no-results feedback at supported viewports.
- FR-11: The selector shall provide loading, no-active-requesters, API-failure, Continue, and Cancel states without allowing a requester screen to bypass selection.
- FR-12: Create Ticket shall load active Categories and Related Systems and visually distinguish its system-generated/read-only values from requester-editable values.
- FR-13: The application shall validate ticket fields on the client and server, preserve recoverable user input after failure, and prevent duplicate submissions while a request is pending.
- FR-14: My Tickets shall present an empty-list state when the selected Requester owns no tickets and a no-results state only when active query controls return no matches.
- FR-15: The ticket list API shall use the identical successful empty response shape for both the empty-list and no-results conditions.
- FR-16: Ticket Detail shall render all ticket information read-only and shall not expose comments, notes, Actions Taken, IT Staff controls, or status-change controls.
- FR-17: Attachment presentation shall distinguish queued, uploading, active, invalid/failed, removed, and unavailable states and keep removed metadata visible.
- FR-18: The API shall return consistent safe error bodies and appropriate status codes for validation, missing/non-owned resources, file type/size, conflict, unavailable attachment, and unexpected failure.
- FR-19: All requester screens shall meet Zen Green, keyboard-accessibility, and desktop/tablet/mobile responsive rules, with visual evidence planned.

## 5. Business Rules

- BR-01: The backend alone generates a unique Ticket Number in `TT-YYYYMMDD-XXXXXX` format.
- BR-02: A newly created ticket has `currentStatus: NEW`, a server-set ticket date/created timestamp, and server-set updated timestamp. Lab 2 has no IT Priority field or IT Staff workflow.
- BR-03: Development Requester selection is a temporary testing mechanism only; it is neither login nor authorization and is replaced by real authentication in Lab 3.
- BR-04: Only active Requesters appear in the selector. If none exist, Continue is unavailable and an empty state is shown; a reference-data load failure shows a safe retryable error.
- BR-05: The selected requester ID is retained in client context and sent on requester-scoped requests in `X-Development-Requester-Id`. The backend uses it as the ownership context; it never trusts a client-supplied ticket owner.
- BR-06: Changing requester clears ticket lists, detail, query state, and pending attachment state before requester-specific data reloads.
- BR-07: Ticket Summary is required after trim and must contain 1-160 characters; Description is required after trim and must contain 1-4,000 characters. Category, Related System, and Requested Priority are required.
- BR-08: Requested Priority is exactly `LOW`, `MEDIUM`, or `HIGH`. Category and Related System IDs must identify active reference records.
- BR-09: Ticket Number, Ticket Date, Requester, and Current Status are read-only. Frontend validation gives field-local feedback; backend repeats all validation. On failure, entered field values and locally selected files remain available for correction.
- BR-10: Submit is disabled while creation is in progress to prevent duplicate submission. A retry after an unknown network outcome requires user action and is not automatically replayed.
- BR-11: List search is case-insensitive containment over Ticket Number and Summary. Supported filters are Category, Related System, Requested Priority, and Current Status; status is `NEW` only in Lab 2.
- BR-12: List sort fields are `updatedAt`, `ticketDate`, `ticketNumber`, `summary`, and `requestedPriority`; default order is `updatedAt:desc` with `id:desc` as the deterministic secondary order. Pages are one-based and `pageSize` is 10, 20, or 50 (default 10).
- BR-13: An owned empty list and a valid query with no matches both return the identical API list shape: `items: []` and `totalItems: 0` with normal pagination metadata. The UI decides between empty-list and no-results copy by whether query controls are active.
- BR-14: A selected Requester cannot retrieve, upload to, download from, or soft-remove attachments from another Requester's ticket. Ownership failures do not reveal the resource.
- BR-15: Active attachments are JPG/JPEG, PNG, WEBP, or PDF; each is at most 5 MiB; no ticket may have more than five active attachments.
- BR-16: The server derives MIME type from validated upload content and stores an opaque server-generated storage key, never a user-supplied path. Display names are sanitized basenames.
- BR-17: Attachment upload failure leaves the ticket intact and reports the individual failure; no partial Attachment database record is exposed. For creation, the ticket is committed first, then selected files upload individually; successful uploads remain and failed files can be retried.
- BR-18: Soft removal requires explicit confirmation and a trimmed reason of 1-500 characters. It records `removedAt` and `removalReason`; the row remains in metadata, but its file/preview/download endpoint returns unavailable.
- BR-19: Attachment upload and removal update the ticket timestamp. Removal is an atomic metadata update; physical file deletion, if used, is deferred until it cannot invalidate the retained audit metadata.
- BR-20: Missing, invalid, inactive, removed, or unexpected resources produce safe errors. The UI preserves safe entered data on recoverable failure and never exposes storage paths or stack traces.
- BR-21: A requester-scoped request without a positive, active `X-Development-Requester-Id` is rejected before any ticket or attachment data is returned. The header is a test-context identifier, never a security credential.
- BR-22: Seed execution is idempotent and supplies the four required Categories (Account and Access, Hardware, Software, Network), at least six Related Systems, at least four active Development Requesters, and at least one inactive Development Requester.
- BR-23: Categories and Related Systems used for creation must be active at validation time; inactive reference data is neither selectable nor valid for new tickets, while historical ticket detail retains its saved reference names.
- BR-24: Ticket Detail and attachment metadata list include removed attachment metadata for the owner, but no endpoint returns a preview/download URL or file bytes for a removed attachment.
- BR-25: Active attachment download uses the detected MIME type and a sanitized `Content-Disposition` filename; the opaque storage key is never included in API output.
- BR-26: Valid list parameters that select an empty page or no matching records return a normal successful pagination envelope; malformed parameters are rejected rather than silently coerced.

## 6. UI Specification Summary

The shell, Zen Green tokens, screen layouts, component states, attachment states, badges, list/card behavior, accessibility, and responsive rules are specified in [ui-spec.md](ui-spec.md). It covers the selection gate, Create Ticket, My Tickets, read-only Ticket Detail, and desktop/tablet/mobile behavior.

## 7. Data Changes

Prisma models are `DevelopmentRequester`, `Category`, `RelatedSystem`, `Ticket`, and `Attachment`.

- `DevelopmentRequester`: `id`, `name`, unique `email`, `active`, timestamps; one-to-many `tickets`.
- `Category` and `RelatedSystem`: `id`, unique `name`, `active`, timestamps; each has many tickets.
- `Ticket`: `id`, unique `ticketNumber`, unique `clientRequestId`, `ticketDate`, `requesterId`, `categoryId`, `relatedSystemId`, `summary`, `requestedPriority`, `currentStatus`, `description`, timestamps; it has many attachments.
- `Attachment`: `id`, `ticketId`, original/sanitized `displayName`, server `storageKey`, detected `mimeType`, `sizeBytes`, `uploadedAt`, nullable `removedAt`, and `removalReason`.

Use enums `RequestedPriority { LOW MEDIUM HIGH }` and `TicketStatus { NEW }`. Foreign keys enforce the required relationships. Unique constraints apply to requester email, reference names, ticket number, and client request ID. Indexes are `Ticket(requesterId, ticketDate, id)`, `Ticket(requesterId, updatedAt, id)`, `Ticket(categoryId)`, `Ticket(relatedSystemId)`, `Ticket(requestedPriority)`, and `Attachment(ticketId, removedAt)`. The requester/recent-ticket indexes are justified because every list query is ownership-scoped and commonly sorted by date. Migration adds the five models/enums and an idempotent seed with four fixed categories, at least six systems, four active requesters, and one inactive requester.

## 8. API Contract summary

The complete endpoint, header, validation, pagination, ownership, error, and status contract is in [api-spec.md](api-spec.md). It covers active reference data; ticket creation/list/detail; and attachment upload, metadata, download, and soft removal.

## 9. Acceptance Criteria

- AC-01: Given active Requesters are available, when a user selects one and continues, then the shell displays that requester and enables requester screens.
- AC-02: Given no requester is selected, when a user navigates to requester ticket screens, then the selector is shown instead.
- AC-03: Given valid required ticket fields, when the selected Requester submits, then one ticket is saved with a unique official Ticket Number and `NEW` status and the number is shown.
- AC-04: Given invalid or missing ticket input, when submit is attempted, then field-local validation appears, no invalid ticket is saved, and entered values remain.
- AC-05: Given a submitted ticket request is pending, when it is processing, then Submit is visibly busy and cannot be activated again.
- AC-06: Given Requester A owns tickets, when Requester B is selected, then A's tickets are not listed or returned through B's list/detail requests.
- AC-07: Given an owned list, when valid search, filters, sort, and pagination are applied, then only matching owned tickets and correct metadata are returned in the requested deterministic order.
- AC-08: Given an owned list has no tickets or an active valid query has no matches, when the list API responds, then both responses use `items: []` and `totalItems: 0`; the UI shows empty-list or no-results copy according to active controls.
- AC-09: Given the selected Requester owns a ticket, when its detail is opened, then its read-only ticket information and attachment metadata are shown.
- AC-10: Given a requester does not own a ticket, when its detail or attachment route is requested, then ticket/attachment data is not returned.
- AC-11: Given an owned ticket with fewer than five active attachments, when a permitted file at most 5 MiB is uploaded, then active metadata and a working download link are returned.
- AC-12: Given an invalid type, oversize file, or five active attachments, when upload is attempted, then upload is rejected safely and existing ticket/attachments remain intact.
- AC-13: Given an active owned attachment, when the requester confirms removal with a valid reason, then it is soft-removed, its metadata remains visible, and preview/download is unavailable.
- AC-14: Given requester context changes, when the change completes, then stale requester-scoped list/detail/query state is cleared and the new context reloads.
- AC-15: Given loading, API failure, or no active requesters, when the relevant screen is opened, then it presents a clear, safe, keyboard-accessible state with retry where applicable.
- AC-16: Given desktop, tablet, and mobile viewports, when the required screens are inspected and navigated by keyboard, then layouts meet responsive rules, controls retain labels/focus states, and no horizontal overflow or clipped content occurs.
- AC-17: Given the selector is loading, has no active Requesters, or its API fails, when the user opens it, then a clear state is shown and Continue cannot open requester ticket screens without a valid selection.
- AC-18: Given Create Ticket opens for a selected Requester, when reference data loads, then only active Categories and Related Systems are selectable and requester/system-generated fields are visibly distinct.
- AC-19: Given ticket text contains leading/trailing whitespace or boundary-length input, when it is submitted, then the backend applies the documented trim/limits and the client reports invalid fields locally.
- AC-20: Given a ticket number is generated, when it is returned, then it matches `TT-YYYYMMDD-XXXXXX`, uses the approved unambiguous suffix alphabet, and is unique.
- AC-21: Given a valid list request selects an empty page or produces no matches, when the API responds, then it returns normal pagination metadata; given malformed query parameters, then it returns a safe validation error rather than silently coercing them.
- AC-22: Given an owned ticket has attachment metadata, when it is listed or downloaded, then active metadata exposes only a relative download path and safe filename; removed metadata exposes no download path or bytes.
- AC-23: Given an attachment removal is unconfirmed, has an invalid reason, is already removed, or is not owned, when removal is attempted, then it is not newly removed and a safe appropriate error is returned.
- AC-24: Given reference-data or ticket/attachment requests fail unexpectedly, when the UI receives the safe error response, then it does not expose internals and preserves recoverable entered values/files with a retry path where applicable.

## 10. Definition of Done

- [ ] All included functional requirements and business rules are implemented; excluded Lab 2 work has not been added.
- [ ] Every acceptance criterion has passing, traceable automated-test evidence; no required test is skipped, disabled, or commented out.
- [ ] Unit, API/integration, UI, style, responsive, visual, and E2E tests pass from documented commands on final `main`.
- [ ] Data migrations, idempotent seed data, ownership checks, validation, attachment soft removal, and safe errors conform to this contract.
- [ ] Screens conform to `ui-spec.md`, including loading, empty/no-results, validation, success, failure, attachment, accessibility, and responsive states.
- [ ] Visual inspection and desktop/tablet/mobile screenshots have been reviewed with no clipping, overlap, overflow, or inconsistent states.
- [ ] `specification.md`, `api-spec.md`, `tests.md`, UI specification, README setup/use/test instructions, and required Lab 2 repository structure are current.
- [ ] Changes were reviewed through the required issue, feature-branch, staging, peer-review, and release workflow; review comments are resolved.
- [ ] The completed requester flow, ownership rejection, failure cases, and attachment lifecycle can be demonstrated from final `main`.

## 11. Assumptions and Decisions

- The selector includes a **Cancel** button because the Section 8.1 figure shows one. It clears any temporary selection and remains on the selector with no navigation; a user cannot bypass the selection gate.
- `Attachment.downloadUrl` is a relative API path, for example `/api/attachments/att_123/download`, not a full host URL. This keeps the API portable across development and deployment origins.
- The Ticket Number suffix uses uppercase `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; ambiguous `0/O/1/I` are excluded. It is six characters, with uniqueness enforced by the backend/database.
- Development context is carried in `X-Development-Requester-Id` rather than a request-body owner field so all requester-scoped endpoints use one explicit, test-only convention. It is not a security credential.
- The labsheet leaves field limits and query vocabulary to the contract; the limits and query rules in BR-07 and BR-12 are the approved Lab 2 choices.
