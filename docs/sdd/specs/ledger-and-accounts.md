# Ledger and accounts

Status: Implemented and verified.

## Purpose

A ledger that can be trusted, and purpose-built accounts that give a finance team a clear picture of its cash.

## User stories

- As a CFO, I see balance, available funds and pending activity for each account.
- As a controller, I download monthly statements.
- As an owner, I am told when idle cash could be earning more.

## Requirements

### Ledger

| ID    | Requirement                                                                            | Verified by                                                             |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| LED-1 | The system SHALL represent money as integer cents                                      | Read                                                                    |
| LED-2 | WHEN an entry is posted, the ledger SHALL update the balance and record `balanceAfter` | Test: moves the balance when posting                                    |
| LED-3 | WHEN a hold is placed, available funds SHALL fall while the balance stays the same     | Test: reduces available funds, not the balance, while a hold is pending |
| LED-4 | WHEN a hold settles, the balance SHALL change exactly once                             | Test: applies a hold to the balance exactly once when it settles        |
| LED-5 | WHEN a hold is released, available funds SHALL be restored                             | Test: frees the funds when a hold is released                           |
| LED-6 | Running balances SHALL reconcile entry by entry for every account                      | Test: keeps running balances consistent with the ledger                 |
| LED-7 | Internal transfers SHALL net to zero across accounts                                   | Test: nets internal transfers to zero across accounts                   |
| LED-8 | Each account SHALL land exactly on its target balance after seeding                    | Test: lands every account exactly on its target balance                 |

### Accounts

| ID     | Requirement                                                                                                                            | Verified by |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| LED-10 | The API SHALL list operating, payroll, tax and reserve accounts with balance, available, pending, APY, 30-day change and a daily trend | Run         |
| LED-11 | The interface SHALL show total balance and the share earning yield                                                                     | Run         |
| LED-12 | WHEN an account is opened, the interface SHALL show its details in a drawer that can be linked to                                      | Run         |
| LED-13 | Account numbers SHALL stay masked until revealed by a user with `accounts:reveal`                                                      | Run         |
| LED-14 | WHEN an account number is revealed, the system SHALL record it in the audit log                                                        | Run         |

### Statements

| ID     | Requirement                                                                     | Verified by |
| ------ | ------------------------------------------------------------------------------- | ----------- |
| LED-20 | The API SHALL produce the last 12 monthly statements for an account             | Run         |
| LED-21 | A statement's opening balance SHALL equal the prior statement's closing balance | Run         |
| LED-22 | A statement SHALL download as CSV                                               | Run         |

### Treasury sweep

| ID     | Requirement                                                                                                                                     | Verified by |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| LED-30 | WHEN operating cash exceeds 30 days of average outflows by at least $100,000, the system SHALL suggest moving the excess to the reserve account | Run         |
| LED-31 | The suggestion SHALL round down to $50,000 and state the annual yield at the reserve's APY                                                      | Run         |
| LED-32 | WHEN the suggestion is accepted, the interface SHALL open the review step with the transfer filled in                                           | Run         |
| LED-33 | WHEN no excess remains, the suggestion SHALL disappear                                                                                          | Run         |

## Acceptance criteria

**A hold protects funds without touching the books**

- **Given** an account with a known balance
- **When** a card authorization is held
- **Then** the balance is unchanged, available funds fall by the amount, and the entry shows as pending

**Sweep**

- **Given** Operating holds more than a month of outflows
- **When** the owner accepts the suggestion and confirms
- **Then** the money moves to Treasury Reserve with no fee and no approval, and both balances update

## API

| Method | Path                                      | Permission        |
| ------ | ----------------------------------------- | ----------------- |
| GET    | `/v1/accounts`                            | `accounts:view`   |
| GET    | `/v1/accounts/:id`                        | `accounts:view`   |
| POST   | `/v1/accounts/:id/reveal`                 | `accounts:reveal` |
| GET    | `/v1/accounts/:id/statements`             | `accounts:view`   |
| GET    | `/v1/accounts/:id/statements/:period/csv` | `accounts:view`   |
| GET    | `/v1/insights/sweep`                      | `insights:view`   |

## Code

`apps/api/src/core/ledger`, `apps/api/src/modules/accounts`, `apps/api/src/seed`, `apps/web/src/features/accounts`
