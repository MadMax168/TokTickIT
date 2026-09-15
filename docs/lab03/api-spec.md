# Sprint 3 API contract

Status: Draft. Read with [specification.md](specification.md), [ui-spec.md](ui-spec.md), and [tests.md](tests.md). Endpoint IDs are used by the requirement trace table.

## Conventions and authorization

Base `/api`; JSON UTF-8 except multipart upload and binary download. IDs are positive safe integers; timestamps are ISO 8601 UTC. Enums use uppercase wire values from specification BR-12/BR-15. Request bodies are strict objects: reject unknown fields, arrays, wrong types, missing required fields and client-generated identity/time/status fields. PATCH bodies require at least one allowed changed field. No body means no request body is accepted. Query rules below are strict, including unknown/repeated keys.

Authorization notation: **R** = unrestricted active Requester session; **S** = unrestricted active IT Staff session; **A** = unrestricted active Administrator session; **L** = active session including must-change state; **Public** = no session required. S/A may read all tickets; R may read/mutate only their own as specified. Authentication and role checks precede lookup/validation that might disclose protected resources. R cross-owner and nonexistent parent tickets share `404 TICKET_NOT_FOUND`; an attachment must belong to that authorized parent. Requester requests to Staff/Admin/notes endpoints receive `403` before resource lookup. Password-change-required sessions get `403 PASSWORD_CHANGE_REQUIRED` on every protected business endpoint regardless of role.

Cookie/session/expiry/hash and CSRF decisions are specification §11. Require trusted Origin on every mutation; valid L mutations also require `X-CSRF-Token`. Missing/untrusted Origin or missing/mismatched required token yields `403 CSRF_INVALID`. Login only requires Origin, because there is no session yet. Sessionless logout requires Origin but no token. Successful login/change rotates cookie and CSRF token. Protected responses and login use `Cache-Control: no-store`; attachment bytes also use `X-Content-Type-Options: nosniff`. Do not embed Internal Notes in any other resource shape. Ignore `X-Development-Requester-Id`; body/query `requesterId` is an invalid unknown field.

## Shared safe errors (apply to every endpoint)

Shape: `{error:{code:string,message:string,fields?:[{field:string,code:string,message:string}]}}`. No stack, SQL, hash, password, token, storage path/key, or unauthorized resource content. `fields` contains only safe input errors. Failed mutations persist no partial business change. All endpoints can return generic `500 INTERNAL_ERROR`; endpoint-specific preserved Lab 2 failures below take precedence where listed.

| Status | Code and meaning |
| --- | --- |
| 400 | `INPUT_INVALID` for malformed JSON/body; `ID_INVALID` for malformed path IDs; `QUERY_INVALID` for invalid query unless a listed legacy code applies. Include safe field errors. |
| 401 | `AUTHENTICATION_REQUIRED` for missing/expired/revoked/inactive session; login instead uses `INVALID_CREDENTIALS` for wrong/unknown/inactive credentials with identical message: Email or password is incorrect. |
| 403 | `FORBIDDEN` for a disallowed role; `PASSWORD_CHANGE_REQUIRED` for restricted sessions; `CSRF_INVALID` as above. |
| 404 | `TICKET_NOT_FOUND`, `ATTACHMENT_NOT_FOUND`, `USER_NOT_FOUND`, or generic `NOT_FOUND`; never distinguish missing/cross-owner tickets. |
| 409 | Conflict codes listed per endpoint; no resource from another Requester in conflict details. |
| 429 | `LOGIN_RATE_LIMITED` with `Retry-After` integer seconds; no account-state details. |
| 500 | `INTERNAL_ERROR` or listed operation failure, generic retry message. |
| 503 | Listed reference/storage failures; no infrastructure details. |

Each endpoint row inherits 400/500, Origin/CSRF rules on mutations, and 401/403 when protected. 404 applies where a resource ID is looked up, and 409 only for the conflicts named below; successful empty lists are 200, never 404. A syntactically valid unknown filter ID yields no matches rather than resource existence errors.

## Resource shapes

Notation is structural, not literal JSON; `?` denotes optional request fields. Response fields shown are always present, with nullable values explicitly indicated.

- `Ref = {id,name}`; `Person = {id,name}`.
- `User = {id,name,email,role,active,mustChangePassword,createdAt,updatedAt}`. No password/session internals. All User administration responses use this safe projection.
- `Identity = {id,name,email,role,active,mustChangePassword}`.
- `Auth = {user:Identity,csrfToken:string}`. The session token is exclusively in Set-Cookie.
- `Owner = {id,name,role,active}`. Role is the current User role; eligible assignment targets are active IT_STAFF or ADMINISTRATOR. Historical terminal-ticket attribution may show a subsequently changed role. No email is needed in ticket/assignment responses.
- `TicketSummary = {id,ticketNumber,ticketDate,requester:Person,category:Ref,relatedSystem:Ref,requestedPriority,currentStatus,summary,lastUpdated,assignedTo:Owner|null,itPriority:LOW|MEDIUM|HIGH,problemAppearsResolved:boolean,version:integer}`.
- `TicketDetail = TicketSummary + {description,createdAt,attachments:Attachment[]}`. Latest transition metadata is stored server-side and is not included in this response; no comment/note arrays here.
- `Attachment = {id,displayName,mimeType,sizeBytes,uploadedAt,removedAt:string|null,removalReason:string|null,isActive:boolean,downloadUrl:string|null}`. Active downloadUrl is `/api/tickets/:ticketId/attachments/:attachmentId/download`; removed URL is null. Never return storageKey, including idempotent creation replay.
- `Comment = {id,ticketId,author:Person,body,createdAt}` and `Note` has the same fields but a separate endpoint/model/channel.
- `Page<T> = {items:T[],page:integer,pageSize:10|20|50,totalItems:integer,totalPages:integer}`. Counts reflect the same filters and authorization as items. Zero matches means items=[], totalItems=0, totalPages=0. Page beyond last means items=[] with actual totals and requested page retained.

## Authentication

| ID | Method/path | Auth | Request | Success | Specific failures/behavior |
| --- | --- | --- | --- | --- | --- |
| EP-01 | POST `/api/auth/login` | Public + trusted Origin | `{email,password}` strings | 200 Auth + new cookie; revoke any presented valid session being replaced | 400 invalid email syntax/missing fields/password outside 1–128 code points; 401 generic wrong/unknown/inactive credentials; 429 BR-06 throttling. Login accepts existing passwords of 1–128 code points; new passwords must satisfy BR-07. Check both failure buckets before credential verification. |
| EP-02 | POST `/api/auth/logout` | L or absent/invalid session | No body | 204, revoke current session if any and expire cookie | 403 CSRF/Origin failure. No 401 for absent/expired/revoked cookie; safe repeat logout. |
| EP-03 | GET `/api/auth/me` | L | No body/query | 200 Auth reflecting current database user/role and session token for CSRF | 401 for invalid session; must-change is a 200 field, not a failure here. |
| EP-04 | POST `/api/auth/change-password` | L | `{currentPassword,newPassword,confirmPassword}` | 200 Auth + rotated cookie; mustChangePassword false | 400 `PASSWORD_INVALID`, `PASSWORD_CONFIRMATION_MISMATCH`, `PASSWORD_REUSED`, `CURRENT_PASSWORD_INVALID`; BR-07 boundaries. Revoke all prior sessions only after successful validation/save. |

## Lab 2 references and Requester operations

The following retain Lab 2 payloads and paths with additive ticket fields and authenticated ownership. Authentication errors replace old `REQUESTER_CONTEXT_*` errors. Public references remain compatible. `/api/development-requesters` returns 404 `{error:{code:"NOT_FOUND",message:"Resource not found."}}` without querying identities. `/api/health` remains Public GET, no input, 200 `{status:"ok",service:"TokTickIT API"}`.

| ID | Method/path | Auth | Request | Success | Specific failures/behavior |
| --- | --- | --- | --- | --- | --- |
| EP-05 | GET `/api/categories` | Public | None | 200 Ref[] active only, ID ascending | 503 `REFERENCE_DATA_UNAVAILABLE`; 500 `REFERENCE_DATA_FAILED`. |
| EP-06 | GET `/api/related-systems` | Public | None | 200 Ref[] active only, ID ascending | Same reference errors as EP-05. |
| EP-07 | POST `/api/tickets` | R | `{clientRequestId:UUID,categoryId:int,relatedSystemId:int,requestedPriority:LOW|MEDIUM|HIGH,summary:string,description:string}` | 201 TicketDetail, or 200 equivalent same-user replay | 400 `TICKET_INPUT_INVALID`; 404 `CATEGORY_NOT_FOUND` / `RELATED_SYSTEM_NOT_FOUND` for absent or inactive references; 409 `IDEMPOTENCY_KEY_REUSED` for different normalized payload or another user's key; 500 `TICKET_CREATE_FAILED`. Strict Lab 2 trimming/length/UUID rules; server number/date, NEW, version=1, indicator=false, owner=null, IT Priority copied from requestedPriority by the server. |
| EP-08 | GET `/api/tickets` | R | My Tickets query below | 200 Page<TicketSummary> scoped to session user | 400 `TICKET_QUERY_INVALID`; 500 `TICKET_LIST_FAILED`. No all-ticket mode on this path. |
| EP-09 | GET `/api/tickets/:ticketId` | R owned, S/A all | Path only | 200 TicketDetail | 400 `TICKET_ID_INVALID`; 404 `TICKET_NOT_FOUND`; 500 `TICKET_DETAIL_FAILED`. |
| EP-10 | POST `/api/tickets/:ticketId/attachments` | R owned | Multipart exactly one `file` part, no other fields | 201 Attachment | 400 `ATTACHMENT_FILE_REQUIRED` / `ATTACHMENT_UPLOAD_INVALID`; 404 parent; 409 `ACTIVE_ATTACHMENT_LIMIT_REACHED`; 413 `ATTACHMENT_TOO_LARGE`; 415 `ATTACHMENT_TYPE_NOT_ALLOWED`; 503 `ATTACHMENT_STORAGE_UNAVAILABLE`; 500 `ATTACHMENT_UPLOAD_FAILED`. BR-23 limits enforced atomically. Ticket remains if upload fails. |
| EP-11 | GET `/api/tickets/:ticketId/attachments` | R owned, S/A all | Path only | 200 Attachment[] | 404 parent; 500 `ATTACHMENT_METADATA_FAILED`. Active first, then removed, each uploadedAt ascending and ID ascending. |
| EP-12a | GET `/api/tickets/:ticketId/attachments/:attachmentId/download` | R owned, S/A all | Path only | 200 binary bytes, stored Content-Type, safe attachment filename in Content-Disposition | 404 parent or `ATTACHMENT_NOT_FOUND` (including wrong parent); 410 `ATTACHMENT_REMOVED`; 503 `ATTACHMENT_STORAGE_UNAVAILABLE`; 500 `ATTACHMENT_DOWNLOAD_FAILED`. No preview path bypass. |
| EP-12b | DELETE `/api/tickets/:ticketId/attachments/:attachmentId` | R owned | `{removalReason:string}` after UI confirmation | 204 no body; retain row, set removedAt/reason | 400 `REMOVAL_REASON_INVALID`; 404 parent/attachment; 409 `ATTACHMENT_ALREADY_REMOVED`; 500 `ATTACHMENT_REMOVE_FAILED`. No workflow-version change. |

`EP-12` in trace ranges means both EP-12a and EP-12b. S/A cannot upload/remove even if an old requesterId happens to equal their user ID.

### My Tickets query (EP-08)

`search`: trimmed case-insensitive contains over ticketNumber/summary, max 120 UTF-16 units, default empty. Optional `categoryId`/`relatedSystemId`: positive integer. Optional `requestedPriority`: LOW/MEDIUM/HIGH. Optional `currentStatus`: any of the eight status wire values. Filters combine with AND; search matches either field. `sortBy`: ticketDate (default), updatedAt, ticketNumber, summary. `sortDirection`: desc (default) or asc. `page`: positive safe integer, default 1; `pageSize`: 10 (default), 20, 50. Stable secondary order is ID descending regardless of primary direction. Reject blank numeric/enums, non-integers, repeated/unknown params, overlong search, invalid enums/sort and offset overflow with 400. A blank search is equivalent to omitted. No requesterId override.

## Shared queue and Staff workflow

| ID | Method/path | Auth | Request | Success | Specific failures/behavior |
| --- | --- | --- | --- | --- | --- |
| EP-13 | GET `/api/staff/tickets` | S/A | Queue query below | 200 Page<TicketSummary> for all tickets | 400 `QUERY_INVALID`; no implicit status exclusions. totalItems is the matching queue count, including terminal tickets. |
| EP-14 | GET `/api/staff/assignees` | S/A | None | 200 `{items:Owner[]}` of active IT_STAFF or ADMINISTRATOR users, name ascending then ID ascending | No email/password data; empty items allowed. Used by ownership selector. |
| EP-15 | PATCH `/api/tickets/:ticketId/assignment` | S | `{action:"claim",version:int}` OR `{action:"assign",assignedToId:int,version:int}` | 200 TicketDetail | 404 parent; 400 invalid union/body; 409 `TICKET_VERSION_CONFLICT`, `TICKET_TERMINAL`, `ALREADY_ASSIGNED`, `ASSIGNEE_UNAVAILABLE`. Claim derives current User and requires null owner; assign covers initial assignment/reassignment to an active IT_STAFF or ADMINISTRATOR target. Requester, inactive (either eligible role), and missing targets return ASSIGNEE_UNAVAILABLE. The actor remains S; an Administrator may be the target without gaining permission to call this mutation. No status change. |
| EP-16 | PATCH `/api/tickets/:ticketId/it-priority` | S/A | `{itPriority:LOW|MEDIUM|HIGH,version:int}` | 200 TicketDetail | 404 parent; 400 invalid enum/null; 409 `TICKET_VERSION_CONFLICT` or `TICKET_TERMINAL`. |
| EP-17 | PATCH `/api/tickets/:ticketId/status` | S | `{currentStatus:TicketStatus,version:int,confirmed:true,reason?:string}` | 200 TicketDetail | 404 parent; 400 `CONFIRMATION_REQUIRED`, `STATUS_REASON_INVALID` or invalid enum; 409 `TICKET_VERSION_CONFLICT`, `STATUS_TRANSITION_INVALID`, `ACTIVE_OWNER_REQUIRED`. Exact specification BR-15 matrix; `RESOLVED`, `CLOSED`, and `CANCELLED` targets require reason; other targets reject reason. |

### Queue query (EP-13)

Search/sort/direction/page/pageSize and validation use My Tickets rules. Queue accepts **one** optional filter: `currentStatus` (eight statuses), `itPriority` (LOW/MEDIUM/HIGH; null and UNSPECIFIED are invalid), or `assignedToId` (positive User ID or literal `unassigned`). Two or more filter keys is 400. Search can accompany the filter. Unknown but valid assignee ID gives no matches. No Category/Related System filter on this new endpoint. UI can preserve this compact contract without building simultaneous filter controls. All tickets are visible regardless of who owns them; requester ownership and assigned IT owner are different fields.

Workflow mutations lock/read the current ticket, validate version and preconditions, then change fields/version/updatedAt atomically. Validation order after authorization: body/path syntax, parent lookup, version match, state-specific prerequisites. Status changes update latest transition metadata; they do not change the indicator/assignee/priority. Comments/notes/attachments do not increment workflow version or ticket.updatedAt; lastUpdated reflects ticket fields/workflow only. Assignee active-role validation accepts IT_STAFF or ADMINISTRATOR and is serialized against Admin role/activity changes. The ACTIVE_OWNER_REQUIRED status prerequisite accepts an active owner of either eligible role; assignment does not grant the owner extra mutation permissions. Refresh after 409; no blind overwrite or automatic replay of stale state.

## Collaboration and Requester indicator

| ID | Method/path | Auth | Request | Success | Specific failures/behavior |
| --- | --- | --- | --- | --- | --- |
| EP-18 | GET `/api/tickets/:ticketId/comments` | R owned, S/A all | Path only | 200 `{items:Comment[]}` oldest first, ID ascending | 404 parent; no notes or hidden-channel counts. Empty is items=[]. |
| EP-19 | POST `/api/tickets/:ticketId/comments` | R owned, S/A all | `{body:string}` | 201 Comment | 400 `COMMENT_INVALID`; 404 parent. 1–2000 trimmed code points; server author/time. |
| EP-20 | GET `/api/tickets/:ticketId/internal-notes` | S/A | Path only | 200 `{items:Note[]}` oldest first, ID ascending | 404 parent for authorized S/A; Requester gets 403 before parent lookup. |
| EP-21 | POST `/api/tickets/:ticketId/internal-notes` | S/A | `{body:string}` | 201 Note | 400 `NOTE_INVALID`; 404 parent for authorized S/A; Requester gets 403 first. Same text limits as comments. |
| EP-22 | PATCH `/api/tickets/:ticketId/resolution-indicator` | R owned | `{problemAppearsResolved:boolean,version:int}` | 200 TicketDetail | 404 parent; 400 invalid boolean/version; 409 `TICKET_VERSION_CONFLICT`. No formal status change, all statuses allowed. |

Development-seeded comments/notes use the same safe response projections and visibility checks as ordinary records. Internal seedKey metadata is never accepted or returned by these endpoints.

Neither posting endpoint is automatically retried after an uncertain network result; UI reloads the list and asks the user to review before posting again. This contract does not claim comment idempotency.

## Administrator User Management

| ID | Method/path | Auth | Request | Success | Specific failures/behavior |
| --- | --- | --- | --- | --- | --- |
| EP-23 | GET `/api/admin/users` | A | User query below | 200 Page<User> | 400 `QUERY_INVALID`; list includes active/inactive accounts unless filtered. |
| EP-24 | POST `/api/admin/users` | A | `{name,email,role,initialPassword,confirmPassword,active?:boolean}` | 201 User; mustChangePassword=true | 400 `USER_INPUT_INVALID`, `PASSWORD_INVALID`, `PASSWORD_CONFIRMATION_MISMATCH`; 409 `EMAIL_EXISTS`. Default active=true; exactly one enum role. |
| EP-25 | PATCH `/api/admin/users/:userId` | A | One or more of `{name?,email?,role?,active?}` | 200 User | 400 `USER_INPUT_INVALID`; 404 `USER_NOT_FOUND`; 409 `EMAIL_EXISTS`, `SELF_DEACTIVATION_FORBIDDEN`, `SELF_ROLE_CHANGE_FORBIDDEN`, `LAST_ACTIVE_ADMIN`, `USER_ROLE_IN_USE`. Apply BR-20/21 atomically; no password field allowed. |
| EP-26 | POST `/api/admin/users/:userId/set-password` | A | `{initialPassword,confirmPassword,confirmed:true}` | 200 User; mustChangePassword=true | 400 password validation/reuse/mismatch or `CONFIRMATION_REQUIRED`; 404 `USER_NOT_FOUND`. Revoke all target sessions, preserve active. If target is current Admin, 200 completes then next protected request is 401; UI sends user to Login. |

User query: `search` trimmed case-insensitive contains on name OR normalized email, at most 120 code points, default empty. One optional filter `role` (single enum) OR `active` (literal true/false); both together is 400. `page`/`pageSize` use 1 and 10 defaults, sizes 10/20/50. Fixed name ascending, ID ascending; no sort parameter. Unknown/repeated/blank-invalid values are 400. No matches/out-of-range pages use Page semantics above.

User names/emails/passwords use specification BR-07/10. New email uniqueness includes inactive accounts and normalization races. Admin-only 409 may identify the invalid field but does not return the other User. Concurrent edits are serialized and validate the current persisted state; last accepted edit to unrelated basic fields is allowed. There is no delete endpoint or history endpoint. Session revalidation, single-role enforcement, self-protection, last-active-Admin invariants and role-in-use restrictions are server rules independent of disabled UI controls.
