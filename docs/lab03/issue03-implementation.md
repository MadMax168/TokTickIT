# Issue 3: authenticated Requester regression and Public Comments

Issue 3 converts the seven Ticket/Attachment routes listed in the Issue 2 handoff from `X-Development-Requester-Id` to the authenticated session identity. The selector endpoint now returns the contract's generic 404 and the default client entry no longer mounts the selector application.

Converted routes:

- ✅ `POST /api/tickets`
- ✅ `GET /api/tickets`
- ✅ `GET /api/tickets/:ticketId`
- ✅ `POST /api/tickets/:ticketId/attachments`
- ✅ `GET /api/tickets/:ticketId/attachments`
- ✅ `GET /api/tickets/:ticketId/attachments/:attachmentId/download`
- ✅ `DELETE /api/tickets/:ticketId/attachments/:attachmentId`

Requester ownership is derived from `req.user.id`; client-supplied requester IDs are ignored. Ticket creation, attachment upload/removal, comments, and the resolution indicator require the authenticated CSRF token. Staff and Administrators can read tickets and Public Comments; Requesters can only access their own records. The resolution indicator uses optimistic version checks and does not change formal status.

Public Comment list/create endpoints were added with trimmed 1–2000 code-point validation, server-derived author/time, append-only records, and role/ownership checks. The Requester shell now provides an authenticated My Tickets list, detail view, Public Comments panel, and posting flow. No Internal Notes, queue, assignment, status, or user-management work was added.

The existing Lab 2 unit fixtures still expect the old selector contract and therefore require migration to authenticated fixtures as part of the Issue 3 test updates. Server and client production builds pass. Full Issue 3 integration/browser tests remain to be added under the planned paths in `docs/lab03/tests.md`; no test row is marked Pass without that verification.
