# Lab 2 REST API Contract

Base path: `/api`. JSON endpoints accept and return `application/json`. Attachment upload accepts `multipart/form-data`. Requester-scoped endpoints require `X-Development-Requester-Id: <positive integer>`; this is a Lab 2 testing context, not authentication.

## Common conventions

Successful retrieval returns `200`; creation returns `201`; successful deletion-as-soft-removal returns `200`. All errors use:

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid.", "fields": { "summary": "Summary is required." } }
}
```

`fields` is present only for field validation. Codes are `VALIDATION_ERROR` (400), `REQUESTER_CONTEXT_REQUIRED` (400), `UNSUPPORTED_MEDIA_TYPE` (415), `PAYLOAD_TOO_LARGE` (413), `NOT_FOUND` (404), `OWNERSHIP_DENIED` (404, deliberately non-disclosing), `CONFLICT` (409), `ATTACHMENT_UNAVAILABLE` (410), and `INTERNAL_ERROR` (500). Unexpected errors do not return stack traces, storage keys, or database details.

## Reference data

### `GET /api/categories`

No requester header. Returns active categories only.

```json
{ "items": [{ "id": 1, "name": "Hardware" }] }
```

Statuses: `200`, `500`.

### `GET /api/related-systems`

No requester header. Returns active systems only.

```json
{ "items": [{ "id": 1, "name": "Corporate Laptop" }] }
```

Statuses: `200`, `500`.

### `GET /api/development-requesters`

No requester header. Returns active test requesters only; inactive requesters are omitted.

```json
{ "items": [{ "id": 1, "name": "Aree Chai", "email": "aree@example.test" }] }
```

Statuses: `200`, `500`.

## Tickets

### `POST /api/tickets`

Headers: `Content-Type: application/json`, `X-Development-Requester-Id`. Body:

```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "description": "Battery falls from 100% to 20% in one hour."
}
```

The header identifies the owner; `requesterId` in the body is not accepted. Validate positive active reference IDs, trimmed summary 1-160, trimmed description 1-4,000, and priority `LOW|MEDIUM|HIGH`. Returns `201` with:

```json
{
  "id": "ticket_123", "ticketNumber": "TT-20260901-2K7M9Q", "ticketDate": "2026-09-01T10:00:00.000Z",
  "requester": { "id": 1, "name": "Aree Chai" }, "category": { "id": 1, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" }, "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM", "itPriority": "MEDIUM", "currentStatus": "NEW",
  "description": "Battery falls from 100% to 20% in one hour.", "attachments": [],
  "createdAt": "2026-09-01T10:00:00.000Z", "updatedAt": "2026-09-01T10:00:00.000Z"
}
```

Statuses: `201`, `400`, `404` (inactive/missing context or reference), `409` (ticket-number collision is retried server-side; only unresolved conflict is returned), `500`.

### `GET /api/tickets`

Header: `X-Development-Requester-Id`. Query parameters: `search` (trimmed, max 160), `categoryId`, `relatedSystemId` (positive integers), `requestedPriority`, `currentStatus` (`NEW`), `sortBy` (`updatedAt|ticketDate|ticketNumber|summary|requestedPriority`), `sortDir` (`asc|desc`), `page` (integer >=1), and `pageSize` (`10|20|50`). Defaults: `sortBy=updatedAt`, `sortDir=desc`, `page=1`, `pageSize=10`; `id:desc` is the secondary ordering.

Search covers Ticket Number and Summary case-insensitively. Returns the same shape for no owned tickets and valid no-match queries:

```json
{
  "items": [{ "id": "ticket_123", "ticketNumber": "TT-20260901-2K7M9Q", "summary": "Laptop battery drains quickly", "category": { "id": 1, "name": "Hardware" }, "relatedSystem": { "id": 2, "name": "Corporate Laptop" }, "requestedPriority": "MEDIUM", "itPriority": "MEDIUM", "currentStatus": "NEW", "ticketDate": "2026-09-01T10:00:00.000Z", "updatedAt": "2026-09-01T10:00:00.000Z" }],
  "page": 1, "pageSize": 10, "totalItems": 1, "totalPages": 1
}
```

For zero results: `items: []`, `totalItems: 0`, `totalPages: 0`, preserving requested valid `page` and `pageSize`. Invalid query values return `400`; unavailable requester context returns `404`; unexpected failure returns `500`.

### `GET /api/tickets/:ticketId`

Header: `X-Development-Requester-Id`. Returns the complete ticket shape from creation plus attachment metadata. `ticketId` must be a nonempty server ID. Missing or non-owned tickets return `404` with `OWNERSHIP_DENIED` for a non-owner and `NOT_FOUND` when absent; no existence distinction is leaked. Statuses: `200`, `400`, `404`, `500`.

## Attachments

Attachment metadata shape:

```json
{
  "id": "attachment_123", "displayName": "battery.png", "mimeType": "image/png", "sizeBytes": 43122,
  "createdAt": "2026-09-01T10:05:00.000Z", "removedAt": null, "removalReason": null,
  "downloadUrl": "/api/attachments/attachment_123/download", "isDownloadable": true
}
```

`downloadUrl` is deliberately a relative path, as decided in `specification.md`; removed attachments set it to `null` and `isDownloadable` to `false`.

### `POST /api/tickets/:ticketId/attachments`

Headers: `X-Development-Requester-Id`; `Content-Type: multipart/form-data`. Form field `file` is required and singular. Ticket must be owned; at most five active attachments may exist. Permit JPG/JPEG, PNG, WEBP, and PDF only after server validation; maximum 5 MiB. The server sanitizes display name and generates storage key. Returns `201` metadata. Statuses: `201`, `400`, `404`, `409` (five active attachments), `413`, `415`, `500`.

### `GET /api/tickets/:ticketId/attachments`

Header: `X-Development-Requester-Id`. Returns all metadata for an owned ticket, including soft-removed rows, newest first:

```json
{ "items": [/* Attachment metadata */] }
```

Statuses: `200`, `400`, `404`, `500`.

### `GET /api/attachments/:attachmentId/download`

Header: `X-Development-Requester-Id`. The attachment's ticket must be owned and the attachment must be active. Returns `200` binary content with validated `Content-Type` and a safe `Content-Disposition` filename. Statuses: `200`, `400`, `404` (missing/non-owned), `410` (soft-removed/unavailable), `500`.

### `DELETE /api/attachments/:attachmentId`

Headers: `Content-Type: application/json`, `X-Development-Requester-Id`. Body:

```json
{ "reason": "Duplicate screenshot" }
```

`reason` is trimmed and 1-500 characters. The attachment must be active and on an owned ticket. Returns `200` with resulting metadata (`removedAt` timestamp, `removalReason`, `downloadUrl: null`, `isDownloadable: false`). Statuses: `200`, `400`, `404`, `409` (already removed), `500`.
