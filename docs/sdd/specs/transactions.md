# Transactions

Status: Implemented and verified.

## Purpose

One ledger view that a controller can live in: fast to search, precise to filter, and easy to annotate.

## User stories

- As a controller, I find any transaction by name, memo, reference or tag.
- As a controller, I narrow the ledger and export exactly what I see.
- As a bookkeeper, I recategorize, annotate and attach receipts.
- As a cardholder, I see my own card activity and nothing else.

## Requirements

### Finding

| ID    | Requirement                                                                                                 | Verified by                                      |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TXN-1 | The system SHALL search counterparty, description, memo, reference and tags                                 | Run                                              |
| TXN-2 | The system SHALL filter by date, account, category, method, status, direction, amount and card              | Test: filters and summarises the ledger, and Run |
| TXN-3 | The system SHALL sort by date, amount or counterparty, in either direction                                  | Run                                              |
| TXN-4 | The list SHALL show the count and the in, out and net totals for the whole filter, not just the loaded page | Test: filters and summarises the ledger          |
| TXN-5 | Every filter SHALL live in the URL, so a view can be shared and survives a reload                           | Run                                              |
| TXN-6 | WHEN sorted by date, the list SHALL group entries under day headings                                        | Run                                              |
| TXN-7 | WHEN the user nears the end of the list, the next 40 entries SHALL load                                     | Run                                              |
| TXN-8 | WHEN nothing matches, the list SHALL say so and offer to clear the filters                                  | Read                                             |

### Reading and editing

| ID     | Requirement                                                                                            | Verified by |
| ------ | ------------------------------------------------------------------------------------------------------ | ----------- |
| TXN-10 | WHEN a row is opened, a drawer SHALL show its facts, descriptor, balance after, reference and timeline | Run         |
| TXN-11 | An open drawer SHALL be linkable and survive a reload                                                  | Run         |
| TXN-12 | A user with `transactions:edit` SHALL be able to change the category, and the change SHALL be audited  | Run         |
| TXN-13 | A memo SHALL save when the field loses focus                                                           | Run         |
| TXN-14 | A user SHALL be able to attach and remove a receipt. The prototype stores the file name only           | Run         |
| TXN-15 | WHEN a transaction links to a payment or invoice, the drawer SHALL link to it                          | Read        |
| TXN-16 | IF the edit has no fields, THEN the API SHALL return 400                                               | Run         |

### Export and scope

| ID     | Requirement                                                                                          | Verified by |
| ------ | ---------------------------------------------------------------------------------------------------- | ----------- |
| TXN-20 | The current filter SHALL export as CSV                                                               | Run         |
| TXN-21 | A cardholder SHALL only ever receive activity from their own cards                                   | Run         |
| TXN-22 | Credits SHALL show in green with a plus sign. Debits stay neutral, to keep attention on what matters | Run         |
| TXN-23 | Failed and returned entries SHALL show as struck through, with their status                          | Read        |

## Acceptance criteria

**Export matches the screen**

- **Given** the ledger filtered to fuel, money out, pending
- **When** the user chooses Export CSV
- **Then** the download carries the same filter

**Deep link**

- **Given** a link to a filtered ledger with a transaction open
- **When** a colleague opens it
- **Then** they see the same filter and the same drawer

## API

| Method | Path                      | Permission          | Notes                         |
| ------ | ------------------------- | ------------------- | ----------------------------- |
| GET    | `/v1/transactions`        | Scoped by role      | 40 per page, up to 200        |
| GET    | `/v1/transactions/export` | Scoped by role      | CSV of the same filter        |
| GET    | `/v1/transactions/:id`    | Scoped by role      |                               |
| PATCH  | `/v1/transactions/:id`    | `transactions:edit` | Category, memo, tags, receipt |

## Code

`packages/contracts/src/transactions.ts`, `apps/api/src/modules/transactions`, `apps/web/src/features/transactions`
