# Peer Review — CPE334 Lab 1: TokTickIT

## My Reviewer Details

| Field | Value |
|-------|-------|
| Reviewer Name | Guntee Doungmanee |
| Student ID | 67070501003 |
| GitHub Username | ovenmakemeheat |

---

## PRs Reviewed by My Peer

| Issue | PR Link | Review Outcome |
|-------|---------|----------------|
| Issue 1: Sprint Spec | https://github.com/MadMax168/TokTickIT/pull/18 | Approved |
| Issue 2: Database Prep | https://github.com/MadMax168/TokTickIT/pull/19 | Approved |
| Issue 3: Req Selection Context | https://github.com/MadMax168/TokTickIT/pull/20 | Approved |
| Issue 4: Ticket Creation | https://github.com/MadMax168/TokTickIT/pull/21 | Approved |
| Issue 5: Ticket Screen | https://github.com/MadMax168/TokTickIT/pull/22 | Approved |
| Issue 6: Attachment Lifecycle | https://github.com/MadMax168/TokTickIT/pull/23 | Approved |
| Issue 7: My Ticket List | https://github.com/MadMax168/TokTickIT/pull/24 | Approved |
| Issue 8: Req Ticket Screen | https://github.com/MadMax168/TokTickIT/pull/25 | Approved |
| Issue 9: Zen Green E2E | https://github.com/MadMax168/TokTickIT/pull/26 | Approved |

---

## Review Comments I Received

### Issue 1
**Comment from peer:**
Thanks for putting the Lab 2 documents together. I’m requesting changes because the PR does not yet meet Issue #9's stated scope. Issue #9 requires FR-01–FR-19, BR-01–BR-26, and AC-01–AC-24 with full traceability, but this PR defines only FR-01–FR-10, BR-01–BR-20, and AC-01–AC-16; tests.md traces only AC-01–AC-16. Please add the missing requirements and traceability, then I’ll re-review.

**My Response:**
I already add it, Pls check it again

---

### Issue 2
**Comment from peer:**
Reviewed against Issue #10 (#10). The schema, migration, seed data, idempotency test, and Docker PostgreSQL setup cover the requested database foundation and preserve existing Category rows. No blocking issues found. Ready to pass.

**My Response:**
Thanked peer for thorough review. No changes required.

---

### Issue 3
**Comment from peer:**
Reviewed against Issue #11. The requester endpoint, context validation, selector states, in-memory context, shell identity, and Change Requester flow are covered. No blocking issues found; ready to pass.

**My Response:**
Thanked peer for thorough review. No changes required.

---

### Issue 4
**Comment from peer:**
Request changes: requesterContext catches every database lookup error as 400 REQUESTER_CONTEXT_INVALID. Thus POST /api/tickets reports a database outage as an invalid requester instead of a documented safe server-failure response. Please separate this error path and add a regression test.

**My Response:**
Fixed. requesterContext now distinguishes requester validation failures from database lookup failures. Missing, malformed, unknown, and inactive requester IDs still return 400 requester-context errors, while a failed requester lookup during POST /api/tickets now returns the documented safe 500 TICKET_CREATE_FAILED response. I also added a regression test that simulates the lookup failure to prevent this from regressing.

---

### Issue 5
**Comment from peer:**
Request changes: After a successful create, the form keeps the same clientRequestId, selected files, and enabled Submit button. A later submit can show the old successful Ticket alongside a 409 conflict or re-upload the same attachments. Please reset/disable the form after success or start a new request intent.

**My Response:**
Fixed. A successful create now locks the completed form, preventing another submit with the same clientRequestId or attachment selection. I added an explicit Create another ticket action that resets the form, clears selected files, and creates a fresh idempotency key for the next submission. A regression test covers both the locked success state and fresh-intent reset.

---

### Issue 6
**Comment from peer:**
Request changes: AttachmentSection renders Download as a plain link, but the API requires X-Development-Requester-Id. Clicking it sends no requester context and returns 400 REQUESTER_CONTEXT_REQUIRED, so active downloads do not work. Fetch the file with the required header before downloading it.

**My Response:**
Fixed. Active attachment downloads now use a header-bearing fetch request with X-Development-Requester-Id, then download the returned Blob via a temporary object URL. I also added a regression test that verifies the download request includes the requester-context header.

---

### Issue 7
**Comment from peer:**
Looks good for Issue #15. The list is scoped to the selected requester and covers search, filters, sorting, pagination, empty/no-results, loading, retry, and stale-data handling. I did not find any blocking issue within this scope.

**My Response:**
-

---

### Issue 8
**Comment from peer:**
Request changes: The new Ticket Detail screen is not connected to the app. My Tickets still shows Open Ticket as a disabled button, and the shell never renders RequesterTicketDetail, so users cannot open the detail page. Please wire the row action to this screen before considering Issue #16 complete.

**My Response:**
Fixed. My Tickets now provides an enabled, accessible Open Ticket action for each row. The application shell stores the selected ticket and renders RequesterTicketDetail, with Back returning to My Tickets. Added regression coverage for the list-to-detail-to-list flow.

---

### Issue 9
**Comment from peer:**
-

**My Response:**
-

---
