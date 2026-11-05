# Invoices

Status: Implemented and verified.

## Purpose

Bill customers, see every receivable by age, and let payments reconcile themselves. Collections also feed capital readiness.

## User stories

- As a controller, I create an invoice and see exactly what the customer will receive.
- As a CFO, I know how much is outstanding and how old it is.
- As a controller, I chase what is late with one click.

## Requirements

| ID     | Requirement                                                                                           | Verified by |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------- |
| INV-1  | The page SHALL show outstanding, overdue, collected in 30 days and average days to pay                | Run         |
| INV-2  | The aging report SHALL split open invoices into not due, 1 to 30, 31 to 60, 61 to 90 and over 90 days | Run         |
| INV-3  | Aging SHALL use one ordered color ramp, with exact values on hover and focus                          | Run         |
| INV-4  | The list SHALL filter by open, overdue, paid and all                                                  | Run         |
| INV-5  | The builder SHALL preview the invoice live as it is filled in                                         | Run         |
| INV-6  | The builder SHALL save a draft or send right away                                                     | Run         |
| INV-7  | The API SHALL calculate subtotal, tax and total on the server                                         | Run         |
| INV-8  | Invoice numbers SHALL continue the company's sequence                                                 | Run         |
| INV-9  | WHEN an open invoice is reminded, the system SHALL record when                                        | Run         |
| INV-10 | WHEN an invoice is marked paid, the receipt SHALL post to the ledger and the invoice SHALL close      | Run         |
| INV-11 | Live activity MAY mark open invoices paid, as customer payments arrive                                | Run         |
| INV-12 | IF an invoice is paid, THEN voiding it SHALL return 409                                               | Run         |
| INV-13 | IF an invoice is not open, THEN reminders and payment SHALL return 409                                | Run         |
| INV-14 | The drawer SHALL show the invoice as the customer sees it, on white in both themes                    | Run         |

## Acceptance criteria

**Payment reconciles**

- **Given** an open invoice for $216.50
- **When** it is marked paid
- **Then** Operating rises by exactly $216.50, the invoice closes, and the receipt appears in the ledger linked to it

## API

| Method | Path                         | Permission        |
| ------ | ---------------------------- | ----------------- |
| GET    | `/v1/invoices`               | `accounts:view`   |
| GET    | `/v1/invoices/summary`       | `accounts:view`   |
| POST   | `/v1/invoices`               | `invoices:manage` |
| POST   | `/v1/invoices/:id/send`      | `invoices:manage` |
| POST   | `/v1/invoices/:id/remind`    | `invoices:manage` |
| POST   | `/v1/invoices/:id/mark-paid` | `invoices:manage` |
| POST   | `/v1/invoices/:id/void`      | `invoices:manage` |

## Code

`apps/api/src/modules/invoices`, `apps/web/src/features/invoices`
