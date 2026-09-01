# Lab 2 UI Specification: Zen Green

## Visual tokens and component conventions

| Token | Value/use |
| --- | --- |
| Primary green | `#006B3C`: header, primary action, strong emphasis |
| Secondary green | `#0B7A46`: active navigation, links, focus ring, hover |
| Pale green | `#EAF6EF`: selected/success/subtle section emphasis |
| Page background | `#F5F7F6` |
| Surface | white, subtle neutral border, restrained shadow |
| Text | dark charcoal-green, never pure black |
| Editable | white fill and clear neutral border |
| Read-only | distinct soft gray-green/warm ivory fill, readable text |
| Error | dark-red border/text; message immediately below field |
| Warning | amber callout/badge only for warning semantics |

Use a consistent sans-serif type scale, labels above controls, 8px spacing increments, visible text on buttons, and consistent input heights. Required fields have a red asterisk plus an explicit label and field-local error. All icon-only controls have accessible names and tooltips. Focus is visible; disabled controls cannot activate; success, error, and badges include text instead of color alone. Primary is green; secondary is outlined/neutral; destructive attachment removal is clearly labeled; busy buttons show text plus progress and are disabled.

## Application shell

Header shows TokTickIT identity, My Tickets, Create Ticket, active-page state, current Development Requester name, and Change Requester. Mobile navigation remains keyboard reachable and does not conceal the current context. The temporary context is labelled “Lab 2 testing only - not a login.”

## Requester Selection

A centered surface contains TokTickIT title, testing-only explanation, active Requester dropdown, Continue, and Cancel. Load active Requesters from the API; show loading, no-active-requesters, and safe retryable error states. Continue is disabled until an active requester is selected. **Cancel is included**: it clears a selection and stays on this gate, because the Section 8.1 figure shows Cancel and no ticket screen is usable without context. Controls are keyboard accessible. On Continue, keep the selected ID in in-memory React context only; the shell shows the name. Change Requester returns here, clears requester-scoped UI state, then reloads the new context. Do not use browser storage.

## Create Ticket

Desktop: centered max-width card; top system/read-only row for Ticket Number (shown after save), Ticket Date, and Requester; classification grid for Category, Related System, and Requested Priority; full-width Summary and taller Description; attachment area below; secondary Cancel and primary Submit at bottom. Ticket Number/date placeholders before creation must be visibly system-generated/read-only. Summary and Description have ample width. Files show queued, uploading, uploaded, invalid, and failed states with per-file messages; only saved tickets can upload to the server. Submit success shows official Ticket Number and next action; validation/failure preserves fields.

## My Tickets

Top row: title, Create Ticket action, search, filters (Category, Related System, Requested Priority, Current Status), sort, and Clear filters. Desktop uses a table with Ticket Number, Summary, Category, Requested Priority, Current Status, Last Updated, and an open affordance. Tablet may use a compact table. Mobile uses clear ticket cards with the same identity fields and tap target. Loading uses skeleton/progress; failure provides retry; no owned tickets uses an empty-list message and Create Ticket action; an active search/filter with no match uses no-results copy and Clear filters. Both states derive from the identical empty API response. Pagination labels page/count and disables unavailable directions.

## Ticket Detail

Show breadcrumb/back action to My Tickets and a read-only information card: Ticket Number, Ticket Date, Requester, Category, Related System, Requested Priority badge, Current Status badge, Summary, and Description. Do not show IT Priority, comments, notes, actions taken, owners, or lifecycle controls. A distinct Attachment section lists active/removed metadata and supports adding a permitted file, downloading an active file, and destructive soft removal only after confirmation/reason. Removed attachments remain metadata-only with a “Removed” text status and unavailable download/preview control. Detail not-found/ownership failure is safe and non-disclosing.

## Responsive rules

| Viewport | Required behavior |
| --- | --- |
| Desktop >= 992px | Centered maximum width and multi-column layouts. |
| Tablet 768-991px | Two columns where practical; Summary/Description retain useful width. |
| Mobile < 768px | Fields stack; navigation/list becomes usable compact layout; touch targets remain usable. |
| All | No clipped labels, overlap, hidden buttons, unreadable file names, or horizontal page scrolling. |

## Visual inspection checklist

- [ ] Verify Zen Green colors, readable text, surface borders/shadows, and editable versus read-only distinction.
- [ ] Verify label/asterisk/message placement, focused/disabled/busy controls, and text-bearing badge states.
- [ ] Capture and inspect Create Ticket, My Tickets, and Ticket Detail at desktop, tablet, and mobile under `artifacts/lab-02/screenshots/`.
- [ ] Verify desktop table and mobile cards/compact table, filters, pagination, empty/no-results, and attachment controls at every viewport.
- [ ] Verify no clipping, overlap, missing state, or unintended horizontal overflow; keyboard focus and accessible labels remain usable.
