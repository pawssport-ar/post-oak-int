# Insights

Status: Implemented and verified.

## Purpose

Reporting that reads like a treasury memo, a forecast that answers "what if", and a way to simply ask.

## User stories

- As a CFO, I project cash and test a decision before making it.
- As a CFO, I see where money goes and how that is changing.
- As an owner, I ask a plain question and get a number I can trust.

## Requirements

### Forecast

| ID    | Requirement                                                                                                                           | Verified by |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| INS-1 | The forecast SHALL project daily cash from 90-day run rates plus the calendar of payroll, rent, leases, insurance and estimated taxes | Run         |
| INS-2 | The horizon SHALL be 30, 90 or 180 days                                                                                               | Run         |
| INS-3 | The user SHALL be able to change revenue, operating costs, collection delay and a one-time outflow                                    | Run         |
| INS-4 | WHEN a lever changes, the projection SHALL recalculate on the server                                                                  | Run         |
| INS-5 | The forecast SHALL show a range that widens with the square root of time                                                              | Read        |
| INS-6 | The forecast SHALL report projected cash and the lowest point                                                                         | Run         |
| INS-7 | IF cash falls below the $6M treasury floor, THEN the floor check SHALL read breached                                                  | Run         |
| INS-8 | IF a horizon is outside 30 to 180 days, THEN the API SHALL return 400                                                                 | Run         |

### Reporting

| ID     | Requirement                                                                                    | Verified by |
| ------ | ---------------------------------------------------------------------------------------------- | ----------- |
| INS-10 | Cash flow SHALL show 12 months of money in and out, excluding internal transfers, on one scale | Run         |
| INS-11 | The current month SHALL be marked as partial                                                   | Run         |
| INS-12 | Spending SHALL break down by category and top vendor for 30 days, 90 days or the year to date  | Run         |
| INS-13 | Each category SHALL compare with the prior period                                              | Run         |
| INS-14 | Categories SHALL link to the filtered ledger                                                   | Read        |

### Assistant and search

| ID     | Requirement                                                                                                                   | Verified by |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| INS-20 | The palette SHALL open with `Ctrl K` or `Cmd K` from anywhere                                                                 | Run         |
| INS-21 | The palette SHALL search transactions, recipients, invoices and cards, from 2 characters                                      | Run         |
| INS-22 | The palette SHALL offer navigation and actions the role allows                                                                | Run         |
| INS-23 | The assistant SHALL answer questions on spend by category or vendor, balances, cash on hand, receivables, bills and approvals | Run         |
| INS-24 | The assistant SHALL understand last month, this month, this week, this quarter and this year                                  | Run         |
| INS-25 | Answers SHALL come only from the ledger, and link to the underlying data                                                      | Run         |
| INS-26 | IF a question is not understood, THEN the assistant SHALL say what it can do, and SHALL NOT guess                             | Run         |

## Acceptance criteria

**Stress test**

- **Given** the 90-day forecast
- **When** the user adds a $3M one-time outflow and slips collections by 15 days
- **Then** the floor check reads breached, and Reset restores it

**Asking**

- **Given** the palette is open
- **When** the user asks "How much did we spend on fuel last month?"
- **Then** the answer states the amount and links to exactly those transactions

## API

| Method | Path                     | Permission      |
| ------ | ------------------------ | --------------- |
| GET    | `/v1/insights/cash-flow` | `insights:view` |
| GET    | `/v1/insights/spending`  | `insights:view` |
| GET    | `/v1/insights/forecast`  | `insights:view` |
| POST   | `/v1/assistant/ask`      | `insights:view` |
| GET    | `/v1/search`             | `accounts:view` |

## Code

`apps/api/src/modules/insights`, `apps/web/src/features/insights`, `apps/web/src/components/layout/command-palette.tsx`
