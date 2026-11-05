# Team and controls

Status: Implemented and verified.

## Purpose

Who can do what, which payments need a second pair of eyes, and a record of everything sensitive.

## User stories

- As an owner, I decide who holds which role.
- As an owner, I set the rules for what needs approval.
- As an auditor, I can see who did what, and when.

## Roles

| Role          | Summary                                                |
| ------------- | ------------------------------------------------------ |
| Owner         | Full control of the relationship, team and policies    |
| Finance admin | Moves money, approves payments and manages cards       |
| Bookkeeper    | Prepares payments and reconciles books, cannot approve |
| Cardholder    | Sees their own cards and activity only                 |

The permission matrix lives in `packages/contracts/src/team.ts`, so the API and the interface read the same source.

## Requirements

| ID     | Requirement                                                                                                  | Verified by |
| ------ | ------------------------------------------------------------------------------------------------------------ | ----------- |
| TEM-1  | The page SHALL list people with role, title, two-factor state and last activity                              | Run         |
| TEM-2  | A user with `team:manage` SHALL invite people and change roles                                               | Run         |
| TEM-3  | IF an email is already on the team, THEN inviting it SHALL return 409                                        | Run         |
| TEM-4  | A user SHALL NOT change their own role                                                                       | Run         |
| TEM-5  | IF a change would leave no owner, THEN the API SHALL return 409                                              | Read        |
| TEM-6  | The page SHALL show the full permission matrix                                                               | Run         |
| TEM-7  | The page SHALL list approval policies with their rails and thresholds                                        | Run         |
| TEM-8  | A user with `policies:manage` SHALL enable, disable and re-threshold policies                                | Run         |
| TEM-9  | WHEN a policy changes, it SHALL apply to the next quote                                                      | Run         |
| TEM-10 | A user without `team:manage` or `policies:manage` SHALL be refused with 403                                  | Run         |
| TEM-11 | The system SHALL record payments, decisions, reveals, card changes, role and policy changes in the audit log | Run         |
| TEM-12 | The audit log SHALL show actor, action, target, detail and time, newest first                                | Run         |
| TEM-13 | Only users with `audit:view` SHALL read the audit log                                                        | Run         |

## Acceptance criteria

**Policy change takes effect**

- **Given** the wire threshold is $25,000
- **When** the owner raises it to $100,000
- **Then** a $50,000 wire no longer needs approval, and the audit log shows the change

## API

| Method | Path               | Permission        |
| ------ | ------------------ | ----------------- |
| GET    | `/v1/team`         |                   |
| POST   | `/v1/team/invite`  | `team:manage`     |
| PATCH  | `/v1/team/:id`     | `team:manage`     |
| GET    | `/v1/policies`     | `accounts:view`   |
| PATCH  | `/v1/policies/:id` | `policies:manage` |
| GET    | `/v1/audit-log`    | `audit:view`      |

## Code

`packages/contracts/src/team.ts`, `apps/api/src/modules/team`, `apps/api/src/core/audit`, `apps/web/src/features/team`
