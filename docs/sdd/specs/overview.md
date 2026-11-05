# Overview

Status: Implemented and verified.

## Purpose

Answer three questions in one screen: how much cash do we have, what needs me, and how is the business doing.

## User stories

- As an owner, I see total cash and how it has moved, the moment I open the app.
- As a CFO, I act on what is waiting for me without leaving the page.
- As anyone with insight access, I see cash flow and where the money goes.

## Requirements

| ID     | Requirement                                                                                                         | Verified by |
| ------ | ------------------------------------------------------------------------------------------------------------------- | ----------- |
| OVW-1  | The page SHALL greet the user by first name, with the company and date                                              | Run         |
| OVW-2  | The hero SHALL show total cash and its change over the selected range                                               | Run         |
| OVW-3  | The hero SHALL offer 30-day, 90-day and 1-year ranges                                                               | Run         |
| OVW-4  | WHEN the pointer moves across the chart, the figure SHALL follow the hovered day                                    | Run         |
| OVW-5  | WHEN the chart has focus, the arrow keys SHALL move through the days                                                | Run         |
| OVW-6  | The hero SHALL show how cash splits across accounts, each linking to its details                                    | Run         |
| OVW-7  | WHEN total cash changes, the figure SHALL count to the new value                                                    | Run         |
| OVW-8  | The page SHALL show money in, money out, net cash flow and days cash on hand, with the prior 30 days for comparison | Run         |
| OVW-9  | The attention queue SHALL list payments awaiting approval, overdue bills and the two largest overdue invoices       | Run         |
| OVW-10 | WHEN the actor can decide on a payment, the queue SHALL offer approve and reject in place                           | Run         |
| OVW-11 | WHEN the actor created the payment, the queue SHALL not offer a decision                                            | Read        |
| OVW-12 | The page SHALL show capital readiness with a link to the full view                                                  | Run         |
| OVW-13 | The page SHALL show the treasury sweep suggestion when one exists                                                   | Run         |
| OVW-14 | The page SHALL show 12 months of cash flow and the top spending categories                                          | Run         |
| OVW-15 | Recent activity SHALL list the last 8 transactions and update live                                                  | Run         |

## Acceptance criteria

**Scrubbing history**

- **Given** the 90-day chart
- **When** the user hovers a day or moves to it with the arrow keys
- **Then** the headline shows that day's balance and date, and returns to today when they leave

**Approving in place**

- **Given** a wire created by someone else
- **When** the owner chooses Approve in the queue
- **Then** the row leaves the queue, a confirmation appears and the wire enters processing

## API

| Method | Path                                      | Permission      |
| ------ | ----------------------------------------- | --------------- |
| GET    | `/v1/overview`                            | `accounts:view` |
| GET    | `/v1/insights/balance?range=30d\|90d\|1y` | `accounts:view` |

Definitions:

- **Money in and out** exclude internal transfers.
- **Days cash on hand** is total cash divided by average daily outflows over the last 90 days.

## Code

`apps/web/src/features/overview`, `apps/web/src/components/charts/balance-chart.tsx`, `apps/api/src/modules/insights`
