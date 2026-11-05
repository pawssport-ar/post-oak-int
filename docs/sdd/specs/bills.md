# Bills

Status: Implemented and verified.

## Purpose

Everything the company owes, by urgency, paid through the same controls as any other payment.

## User stories

- As an AP specialist, I see what is overdue and what is coming.
- As a controller, I pay or schedule a bill in two clicks, knowing the approval rules still apply.

## Requirements

| ID     | Requirement                                                                                        | Verified by |
| ------ | -------------------------------------------------------------------------------------------------- | ----------- |
| BIL-1  | The page SHALL group bills as overdue, due in 14 days, later, in progress and paid                 | Run         |
| BIL-2  | The page SHALL show the open total and how many are overdue                                        | Run         |
| BIL-3  | A bill SHALL be overdue when it is awaiting payment past its due date                              | Run         |
| BIL-4  | A user with `bills:manage` SHALL add a bill                                                        | Run         |
| BIL-5  | WHEN a bill is paid, the system SHALL create a normal payment, so approvals and audit apply        | Run         |
| BIL-6  | A bill SHALL be payable by ACH or wire, today or on a future date                                  | Run         |
| BIL-7  | IF a bill is already being paid, THEN the API SHALL refuse with 409                                | Run         |
| BIL-8  | IF the vendor is not a saved recipient, THEN the system SHALL create one, so it is reviewed as new | Run         |
| BIL-9  | WHEN the payment settles, the bill SHALL be marked paid                                            | Run         |
| BIL-10 | WHEN the payment is rejected or canceled, the bill SHALL return to awaiting payment                | Run         |

## Acceptance criteria

**No shortcut around approvals**

- **Given** a bill above the ACH threshold
- **When** a controller pays it
- **Then** the payment waits for approval like any other

## API

| Method | Path                | Permission      |
| ------ | ------------------- | --------------- |
| GET    | `/v1/bills`         | `accounts:view` |
| POST   | `/v1/bills`         | `bills:manage`  |
| POST   | `/v1/bills/:id/pay` | `bills:manage`  |

## Code

`apps/api/src/modules/bills`, `apps/web/src/features/bills`
