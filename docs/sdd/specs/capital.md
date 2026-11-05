# Capital

Status: Implemented and verified.

## Purpose

This is where the concept differs from any other business bank. It reads a client's banking data the way a Post Oak deal team would, and turns an operating account into the start of an advisory relationship.

## User stories

- As an owner, I understand how a buyer or lender would see my company today.
- As an owner, I know what to fix before going to market.
- As an owner, I can reach a senior advisor when I am ready.

## Scoring

Five pillars, calculated live from accounts, invoices and receipts.

| Pillar          | Measure                                             | Target    | Score                       | Weight |
| --------------- | --------------------------------------------------- | --------- | --------------------------- | ------ |
| Liquidity       | Days cash on hand                                   | 90 days   | `days / 90`                 | 20%    |
| Growth          | Latest six months of receipts against the prior six | 10%       | `50 + growth × 500`         | 20%    |
| Cash margin     | Twelve-month net cash flow over receipts            | 12%       | `margin / 12%`              | 25%    |
| Diversification | Largest customer's share of receipts                | Under 15% | `100 − (share − 10%) × 330` | 20%    |
| Collections     | Average days to pay, last 90 days                   | 35 days   | `100 − (days − 30) × 3.2`   | 15%    |

Each pillar is clamped from 0 to 100.

| Score | Band              |
| ----- | ----------------- |
| 85+   | Institutional     |
| 68+   | Transaction ready |
| 50+   | Developing        |
| Below | Foundational      |

The indicative range applies a multiple to trailing operating cash flow. The low multiple is `4.5 + 2 × score / 100`, and the high is 2 turns above it.

## Requirements

| ID     | Requirement                                                                                               | Verified by                                                   |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| CAP-1  | The API SHALL calculate the five pillars from live sandbox data                                           | Run                                                           |
| CAP-2  | Every pillar SHALL stay between 0 and 100                                                                 | Test: keeps every pillar between 0 and 100                    |
| CAP-3  | A strong business SHALL score as institutional                                                            | Test: scores a strong business as institutional               |
| CAP-4  | WHEN one customer dominates receipts, the insight SHALL name them                                         | Test: flags concentration by name when one customer dominates |
| CAP-5  | Higher readiness SHALL earn a higher multiple                                                             | Test: rewards readiness with a higher multiple                |
| CAP-6  | The page SHALL draw the pillars as five columns under one entablature, filling to their score             | Run                                                           |
| CAP-7  | WHEN a pillar is hovered or focused, the page SHALL explain it                                            | Run                                                           |
| CAP-8  | The page SHALL list each pillar's value, insight and score, so nothing depends on hover                   | Run                                                           |
| CAP-9  | The page SHALL show the score history for six months                                                      | Run                                                           |
| CAP-10 | The value range SHALL state it is illustrative, and not a valuation, offer or investment advice           | Run                                                           |
| CAP-11 | The page SHALL offer growth capital, debt, sale and acquisition paths, mapped to Post Oak's two practices | Run                                                           |
| CAP-12 | WHEN a user requests a conversation, the system SHALL record it and confirm                               | Run                                                           |
| CAP-13 | Advisor flows SHALL state that they are samples and reach no one                                          | Run                                                           |
| CAP-14 | Firm figures SHALL be quoted from postoakgroup.co and attributed                                          | Run                                                           |
| CAP-15 | Cardholders SHALL NOT see this page                                                                       | Run                                                           |

The six-month history steps back from today's score. It illustrates the trend rather than recalculating past periods.

## Acceptance criteria

**Reading the columns**

- **Given** the Capital page
- **When** the user hovers Diversification
- **Then** the others dim, and the text names the customer that holds the score down

## API

| Method | Path                    | Permission      |
| ------ | ----------------------- | --------------- |
| GET    | `/v1/capital/readiness` | `insights:view` |
| POST   | `/v1/capital/requests`  | `insights:view` |

## Code

`apps/api/src/modules/capital`, `apps/web/src/features/capital`, `apps/web/src/components/charts/portico.tsx`
