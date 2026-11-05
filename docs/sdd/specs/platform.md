# Platform

Status: Implemented and verified.

## Purpose

The shared foundation every feature stands on: isolated sandboxes, acting users, consistent errors, live events, and one origin for the browser.

## User stories

- As a reviewer, I can open the link and use everything right away, without an account.
- As a reviewer, I can move money freely, knowing nobody else sees it and I can start over.
- As a finance user, I see activity arrive without refreshing.

## Requirements

### Sandboxes

| ID    | Requirement                                                                                                                        | Verified by                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| PLT-1 | WHEN a browser first requests the app, the web app SHALL set an `httpOnly`, `SameSite=Lax` `po_sandbox` cookie holding a random id | Run                                      |
| PLT-2 | WHEN the API first sees a sandbox id, it SHALL create a seeded workspace for it                                                    | Test: isolates sandboxes from each other |
| PLT-3 | The API SHALL keep each sandbox's data isolated from every other sandbox                                                           | Test: isolates sandboxes from each other |
| PLT-4 | IF the sandbox header is missing or malformed, THEN the API SHALL use a shared public sandbox                                      | Run                                      |
| PLT-5 | The API SHALL drop sandboxes idle for 2 hours, and evict the least recently used above 100                                         | Read                                     |
| PLT-6 | WHEN a sandbox is reset, the API SHALL cancel its pending work and restore the seed                                                | Run                                      |
| PLT-7 | The seed SHALL be deterministic for a given day and anchored to today                                                              | Test: is deterministic for a given day   |
| PLT-8 | The seed SHALL never date activity in the future                                                                                   | Test: never dates activity in the future |

### Identity and permissions

| ID     | Requirement                                                                                               | Verified by                                                   |
| ------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| PLT-10 | The API SHALL act as one user per sandbox, starting with the owner                                        | Run                                                           |
| PLT-11 | WHEN a persona switch is requested, the API SHALL act as that active team member from then on             | Run                                                           |
| PLT-12 | IF the requested persona is invited but not active, THEN the API SHALL refuse with 404                    | Run                                                           |
| PLT-13 | WHEN a route declares a permission the actor lacks, the API SHALL refuse with 403                         | Test: enforces roles on the server, not only in the interface |
| PLT-14 | The interface SHALL hide navigation the role cannot use, and explain any restricted page reached directly | Run                                                           |
| PLT-15 | WHEN a cardholder opens the home page, the interface SHALL send them to Cards                             | Run                                                           |

### Errors and validation

| ID     | Requirement                                                                       | Verified by                                            |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| PLT-20 | Every failed request SHALL return an RFC 9457 document with a stable `code`       | Test: never lets the creator approve their own payment |
| PLT-21 | WHEN input fails its schema, the API SHALL return 400 with per-field messages     | Test: rejects invalid input with field-level detail    |
| PLT-22 | IF the API is unreachable, THEN the web proxy SHALL return a 503 problem document | Run                                                    |

### Live events

| ID     | Requirement                                                                                                                               | Verified by |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| PLT-30 | The API SHALL stream sandbox events over Server-Sent Events at `GET /v1/events`, with a heartbeat every 20 seconds                        | Run         |
| PLT-31 | Each event SHALL name the client caches to refresh, and MAY carry a notification                                                          | Run         |
| PLT-32 | WHEN an event arrives, the web app SHALL refresh the named caches and show any notification as a toast                                    | Run         |
| PLT-33 | The interface SHALL show whether the live stream is connected                                                                             | Run         |
| PLT-34 | The API SHALL simulate activity only for sandboxes with a browser connected, starting about 15 seconds in and then every 32 to 65 seconds | Run         |

### Delivery

| ID     | Requirement                                                                           | Verified by                                               |
| ------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| PLT-40 | The browser SHALL only call its own origin, and the web app SHALL forward to the API  | Run                                                       |
| PLT-41 | The web app SHALL read `API_URL` at runtime                                           | Run                                                       |
| PLT-42 | The proxy SHALL stream responses without buffering Server-Sent Events                 | Run                                                       |
| PLT-43 | The API reference SHALL be available at `/docs` from the web origin                   | Run                                                       |
| PLT-44 | The API SHALL answer `GET /health`, and the web app `GET /healthz`, without a sandbox | Test: answers the health probe without a sandbox, and Run |
| PLT-45 | `pnpm start` SHALL run both apps as one service, with the web app on `PORT`           | Run                                                       |
| PLT-46 | Each app SHALL build on its own, so it can deploy as a separate service               | Run                                                       |
| PLT-47 | The app SHALL ask search engines not to index it                                      | Read                                                      |

## Acceptance criteria

**Sandbox isolation**

- **Given** two visitors with different sandboxes
- **When** one creates a payment
- **Then** the other's payment list is unchanged

**First contact**

- **Given** a browser with no cookies
- **When** it opens the home page
- **Then** the dashboard shows data with no sign-in, and parallel first requests all land in one sandbox

## API

| Method | Path                     | Permission | Purpose                                  |
| ------ | ------------------------ | ---------- | ---------------------------------------- |
| GET    | `/v1/session`            |            | Company, actor, permissions and personas |
| POST   | `/v1/session/persona`    |            | Act as another team member               |
| POST   | `/v1/session/reset`      |            | Restore the sandbox                      |
| GET    | `/v1/notifications`      |            | Recent notifications                     |
| POST   | `/v1/notifications/read` |            | Mark all read                            |
| GET    | `/v1/events`             |            | Server-Sent Events stream                |
| GET    | `/health`                | Public     | Liveness                                 |

## Code

`apps/api/src/common`, `apps/api/src/core`, `apps/api/src/baas`, `apps/web/src/proxy.ts`, `apps/web/src/lib/api`, `apps/web/src/lib/realtime.ts`
