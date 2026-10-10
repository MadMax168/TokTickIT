# Lab 4 UI Specification

Reuse Zen Green tokens `#006b3c`, `#0b7a46`, `#eaf6ef`, `#f5f7f6`, `#173b2a`, white cards, and `#cfd8d2` borders. Remove starter blue, duplicate, temporary, obsolete, or placeholder UI.

## Dashboards
IT Staff cards: Unassigned Tickets, Owned by me, By status, By IT Priority, Recently updated. Admin reuses it and may show concise active-user counts. Requester cards: Total open, Waiting for Requester, Recently updated, Recently resolved; all data is authenticated-owner scoped. Cards have labels, values, text alternatives, keyboard drill-down, and recent rows open Ticket Detail.

| Metric | Query/calculation, time zone/boundary | Empty | Drill-down |
|---|---|---|---|
| totalOpen | owner status OPEN/IN_PROGRESS/WAITING_FOR_REQUESTER/REOPENED | 0 | `/tickets?currentStatus=open` |
| waitingForRequester | owner WAITING_FOR_REQUESTER | 0 | `/tickets?currentStatus=WAITING_FOR_REQUESTER` |
| recentlyUpdated | owner updatedAt in last 7 Asia/Bangkok days, max 5, DESC | empty | `/tickets?updatedSince=<start>` |
| recentlyResolved | owner RESOLVED/CLOSED in same window/max/order | empty | `/tickets?currentStatus=RESOLVED` |
| unassigned | staff-visible assignedToId IS NULL | 0 | `/tickets?assignedToId=unassigned` |
| ownedByCurrentUser | staff-visible assignedToId=current user | 0 | `/tickets?assignedToId=<id>` |
| byStatus | staff-visible group by every TicketStatus | each status 0 | `/tickets?currentStatus=<status>` |
| byPriority | staff-visible group by LOW/MEDIUM/HIGH itPriority | each priority 0 | `/tickets?itPriority=<priority>` |
| staffRecentlyUpdated | staff-visible last 7 Asia/Bangkok days, max 5, DESC | empty | `/tickets?updatedSince=<start>` |

Boundary is local date minus seven days at 00:00 inclusive through current local instant exclusive, converted to UTC by backend.

## Actions Taken and workflow
Ticket Detail has a semantic list/table with date/time, description, result, performed by, approved assignee, follow-up flag/note, and attachment notes. Staff get Create/Edit; Requesters read only. Create validates date/time, description, result, required active IT Staff/Admin assignee, conditional follow-up note, and optional attachment notes. Inactive or non-support assignees show a safe validation error. Edit sends version and never edits performedBy. Save prevents repeated clicks and refreshes stable order. Status controls show only permitted transitions; confirmation/reason is required where specified and success refreshes the summary. Requester resolved-indication remains advisory. Role navigation has Dashboard and existing permitted pages with aria-current.

## States, responsive, accessibility
All views define loading, empty, forbidden, conflict, not-found, validation, and safe-failure states with recovery and retained form data. Desktop uses multi-column cards/full tables; tablet wraps cards/stacks readable tables; mobile uses one column, full-width actions, labeled card rows, and no horizontal scroll. Use semantic headings/landmarks/labels/live regions, visible focus, keyboard operation, non-color status cues, accessible named dialogs with focus return/Escape, usable touch targets, and no clipping/overlap.
