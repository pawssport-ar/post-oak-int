# Cards

Status: Implemented and verified.

## Purpose

Give every driver, manager and subscription the right card, with limits and controls that take effect immediately.

## User stories

- As a CFO, I issue a virtual card in seconds, with its own limit.
- As a fleet manager, I freeze a lost card right away.
- As a CFO, I control where each card can be used.
- As a cardholder, I manage my own card without seeing anyone else's.

## Requirements

### Issuing and viewing

| ID    | Requirement                                                                                              | Verified by           |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------- |
| CRD-1 | A user with `cards:manage` SHALL issue physical or virtual cards with a holder, limit, period and finish | Run                   |
| CRD-2 | The issue dialog SHALL preview the card as it is configured                                              | Run                   |
| CRD-3 | WHEN a card is issued, it SHALL be active and selected                                                   | Run                   |
| CRD-4 | A user with `cards:manage` SHALL see all cards, and anyone else only their own                           | Run                   |
| CRD-5 | IF a user requests another person's card without `cards:manage`, THEN the API SHALL return 403           | Run                   |
| CRD-6 | The card SHALL tilt toward the pointer, and a frozen card SHALL look frozen                              | Run. The tilt is Read |

### Controls

| ID     | Requirement                                                                                               | Verified by                    |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| CRD-10 | The holder or a manager SHALL be able to freeze and unfreeze a card                                       | Run                            |
| CRD-11 | A user with `cards:manage` SHALL change the limit, online, ATM and international use, and merchant groups | Run                            |
| CRD-12 | Other users SHALL see the controls as read-only, and the API SHALL refuse changes with 403                | Run                            |
| CRD-13 | Limits SHALL apply daily, over 7 days, or over a rolling 30 days                                          | Read                           |
| CRD-14 | The page SHALL show spend inside the limit window, and warn by color near the limit                       | Run. The color warning is Read |
| CRD-15 | Control changes SHALL apply optimistically in the interface                                               | Read                           |

### Authorization

| ID     | Requirement                                                                               | Verified by |
| ------ | ----------------------------------------------------------------------------------------- | ----------- |
| CRD-20 | IF a card is frozen, THEN a purchase SHALL be declined and the user notified              | Run         |
| CRD-21 | IF a merchant group is blocked, THEN a purchase SHALL be declined                         | Read        |
| CRD-22 | IF a purchase would exceed the limit, THEN it SHALL be declined                           | Read        |
| CRD-23 | WHEN a purchase is authorized, it SHALL appear as pending and post about 20 seconds later | Run         |

### Sensitive data

| ID     | Requirement                                                                      | Verified by |
| ------ | -------------------------------------------------------------------------------- | ----------- |
| CRD-30 | Card lists and details SHALL never include the full number or CVC                | Run         |
| CRD-31 | Full details SHALL come only from an explicit reveal, by the holder or a manager | Run         |
| CRD-32 | WHEN a card is revealed, the system SHALL record it in the audit log             | Run         |
| CRD-33 | Numbers SHALL be obvious test values                                             | Run         |

## Acceptance criteria

**A freeze takes effect**

- **Given** an active card
- **When** it is frozen and a purchase is attempted
- **Then** the purchase is declined, nothing reaches the ledger, and a notification says why

**Scope**

- **Given** Hannah, a cardholder
- **When** she opens Cards
- **Then** she sees her two cards, can freeze them, and cannot change their limits

## API

| Method | Path                     | Permission        |
| ------ | ------------------------ | ----------------- |
| GET    | `/v1/cards`              | Scoped by role    |
| GET    | `/v1/cards/:id`          | Holder or manager |
| POST   | `/v1/cards`              | `cards:manage`    |
| PATCH  | `/v1/cards/:id`          | `cards:manage`    |
| POST   | `/v1/cards/:id/freeze`   | Holder or manager |
| POST   | `/v1/cards/:id/unfreeze` | Holder or manager |
| POST   | `/v1/cards/:id/reveal`   | Holder or manager |

## Code

`packages/contracts/src/cards.ts`, `apps/api/src/modules/cards`, `apps/api/src/baas/activity-simulator.ts`, `apps/web/src/features/cards`
