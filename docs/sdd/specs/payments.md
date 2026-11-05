# Payments

Status: Implemented and verified.

## Purpose

Move money the way a finance team needs to: clear about what will happen before it happens, protected by a second pair of eyes, and visible until it lands.

## User stories

- As a controller, I prepare a payment and know exactly what it costs and when it arrives.
- As a CFO, I review and approve what others prepare, and I can never approve my own.
- As an owner, I watch a payment move through to settlement.
- As a controller, I save a new vendor safely, with typos caught before they cost money.

## Rules

| Method   | Fee    | Arrival                                              | Approval            |
| -------- | ------ | ---------------------------------------------------- | ------------------- |
| ACH      | Free   | Next business day, or 2 after the 6:00 PM CT cut-off | At or above $50,000 |
| Wire     | $25.00 | Same day before 4:00 PM CT, else next business day   | At or above $25,000 |
| Instant  | $1.50  | Within seconds                                       | At or above $50,000 |
| Internal | Free   | Immediately                                          | Never               |

The first payment to a new recipient needs review at any amount. All thresholds are editable under [Team and controls](team-and-controls.md).

## Requirements

### Quote

| ID    | Requirement                                                                                                              | Verified by                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| PAY-1 | WHEN a payment is reviewed, the API SHALL return fee, arrival, approvals, approvers and funds left, without moving money | Run                                                                                                                             |
| PAY-2 | The arrival date SHALL honor cut-offs and weekends                                                                       | Test: rolls a late wire to the next business day; skips the weekend for a Friday evening wire; treats weekends as after cut-off |
| PAY-3 | A same-day wire SHALL land today before the cut-off                                                                      | Test: lands a wire the same day before the Fedwire cut-off                                                                      |
| PAY-4 | ACH SHALL settle on the next business day, and instant and internal rails right away                                     | Test: settles ACH on the next business day; settles instant and internal rails right away                                       |
| PAY-5 | The quote SHALL warn about a low operating balance, a passed cut-off, a new recipient and a large amount                 | Run. The passed cut-off warning is Read                                                                                         |
| PAY-6 | IF funds are insufficient, THEN the quote SHALL block submission and the API SHALL refuse with 422                       | Test: refuses a payment the account cannot cover                                                                                |
| PAY-7 | Transfers between own accounts SHALL use the internal rail, and recipients SHALL NOT                                     | Run                                                                                                                             |
| PAY-8 | IF source and destination are the same account, THEN the API SHALL refuse with 422                                       | Run                                                                                                                             |

### Approval

| ID     | Requirement                                                                            | Verified by                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| PAY-10 | WHEN a payment matches an enabled policy, it SHALL wait for approval and move no money | Test: holds large wires for approval and moves nothing yet                                                                                |
| PAY-11 | Policies SHALL apply at or above their threshold, per method                           | Test: requires a second person at the wire threshold; applies a separate threshold to ACH; lets a small wire to a known recipient through |
| PAY-12 | The first payment to a new recipient SHALL need review at any amount                   | Test: reviews the first payment to a new recipient, whatever the amount                                                                   |
| PAY-13 | Internal transfers SHALL be exempt                                                     | Test: exempts transfers between the company's own accounts                                                                                |
| PAY-14 | Disabled policies SHALL not apply                                                      | Test: ignores disabled policies                                                                                                           |
| PAY-15 | The creator SHALL NOT be able to approve or reject their own payment                   | Test: never lets the creator approve their own payment                                                                                    |
| PAY-16 | WHEN someone else approves, the payment SHALL be released                              | Test: releases the payment once someone else approves it                                                                                  |
| PAY-17 | A user without `payments:approve` SHALL NOT be able to decide                          | Test: enforces roles on the server, not only in the interface                                                                             |
| PAY-18 | WHEN a payment is rejected, it SHALL stop and move no money                            | Run                                                                                                                                       |

### Submission and lifecycle

| ID     | Requirement                                                                                                      | Verified by                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| PAY-20 | A repeated `Idempotency-Key` SHALL replay the first response and create nothing                                  | Test: replays the original response for a repeated idempotency key |
| PAY-21 | The send flow SHALL use one idempotency key per attempt                                                          | Read                                                               |
| PAY-22 | WHEN released, a payment SHALL place a hold and go to the provider                                               | Test: releases the payment once someone else approves it           |
| PAY-23 | Provider events SHALL move it from processing to in transit to settled                                           | Run                                                                |
| PAY-24 | WHEN settled, the hold SHALL post, any fee SHALL post as its own entry, and the recipient's history SHALL update | Run                                                                |
| PAY-25 | A payment with a future date SHALL wait as scheduled. Releasing it on the date is out of scope                   | Run                                                                |
| PAY-26 | A payment SHALL be cancelable until it leaves the bank, by its creator or an approver                            | Run                                                                |
| PAY-27 | IF a payment has already left, THEN canceling SHALL return 409                                                   | Run                                                                |
| PAY-28 | Every state change SHALL be recorded in the payment's timeline                                                   | Run                                                                |

### Interface

| ID     | Requirement                                                                                             | Verified by |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------- |
| PAY-30 | Sending money SHALL be a three-step flow, reachable from the top bar, the palette and mobile navigation | Run         |
| PAY-31 | The final step SHALL present the payment as a tombstone, worded for its state                           | Run         |
| PAY-32 | WHEN a payment waits for approval, the final step SHALL offer to continue as an approver                | Run         |
| PAY-33 | The Payments page SHALL separate items needing approval, in flight, history and recipients              | Run         |
| PAY-34 | The payment drawer SHALL show progress, facts and history, and a tombstone once settled                 | Run         |

### Recipients

| ID     | Requirement                                                                | Verified by                                                       |
| ------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| PAY-40 | The form SHALL validate the ABA routing checksum as the user types         | Test: seeds the routing number with a valid ABA checksum, and Run |
| PAY-41 | WHEN a routing number is valid, the form SHALL name the bank               | Run                                                               |
| PAY-42 | IF a recipient of the same name exists, THEN the API SHALL refuse with 409 | Run                                                               |
| PAY-43 | A new recipient SHALL stay new until their first payment settles           | Run                                                               |

## Acceptance criteria

**Maker-checker, end to end**

- **Given** Elena creates a $48,200 wire
- **When** she reviews it
- **Then** she is told Marcus must approve it, and after sending, no money has moved
- **When** she tries to approve it herself
- **Then** the API refuses with 403
- **When** Marcus approves it
- **Then** it holds funds, moves to in transit, settles, and the fee posts separately

**Safe retry**

- **Given** a payment was created with a key
- **When** the same request repeats with the same key
- **Then** the same payment returns, and only one exists

## API

| Method | Path                         | Permission         |
| ------ | ---------------------------- | ------------------ |
| GET    | `/v1/payments`               | `accounts:view`    |
| GET    | `/v1/payments/:id`           | `accounts:view`    |
| POST   | `/v1/payments/quote`         | `payments:create`  |
| POST   | `/v1/payments`               | `payments:create`  |
| POST   | `/v1/payments/:id/approve`   | `payments:approve` |
| POST   | `/v1/payments/:id/reject`    | `payments:approve` |
| POST   | `/v1/payments/:id/cancel`    | `payments:create`  |
| GET    | `/v1/recipients`             | `payments:create`  |
| POST   | `/v1/recipients`             | `payments:create`  |
| GET    | `/v1/recipients/bank-lookup` | `payments:create`  |

## Code

`apps/api/src/modules/payments`, `apps/api/src/modules/recipients`, `apps/api/src/baas`, `apps/web/src/features/payments`
