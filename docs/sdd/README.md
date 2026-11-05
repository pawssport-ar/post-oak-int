# Specifications

Every behavior in Post Oak Business Banking has a requirement, every requirement has a stable ID, and every ID traces to code and to the check that proves it. These documents are the source of truth for what the product does.

## Map

| Document                        | Answers                                                   |
| ------------------------------- | --------------------------------------------------------- |
| [Brief](brief.md)               | Why this exists, who it serves, what is in and out        |
| [Constitution](constitution.md) | The rules every spec and every change must respect        |
| [Technical design](design.md)   | How the system fits together, and the decisions behind it |
| [Tasks](tasks.md)               | The work, broken into verifiable tasks                    |
| [Verification](verification.md) | What was checked, how, and what is not covered            |

### Feature specs

| Spec                                                | Prefix | Scope                                                     |
| --------------------------------------------------- | ------ | --------------------------------------------------------- |
| [Platform](specs/platform.md)                       | `PLT`  | Sandboxes, roles, errors, live events, the web-to-API hop |
| [Ledger and accounts](specs/ledger-and-accounts.md) | `LED`  | Balances, holds, statements, treasury sweep               |
| [Overview](specs/overview.md)                       | `OVW`  | The dashboard home                                        |
| [Transactions](specs/transactions.md)               | `TXN`  | Search, filters, detail, export                           |
| [Payments](specs/payments.md)                       | `PAY`  | Quotes, approvals, lifecycle, recipients                  |
| [Cards](specs/cards.md)                             | `CRD`  | Issuing, freezing, limits, controls                       |
| [Bills](specs/bills.md)                             | `BIL`  | Vendor bills                                              |
| [Invoices](specs/invoices.md)                       | `INV`  | Receivables and aging                                     |
| [Insights](specs/insights.md)                       | `INS`  | Forecast, reporting, assistant, search                    |
| [Capital](specs/capital.md)                         | `CAP`  | Readiness score and advisory requests                     |
| [Team and controls](specs/team-and-controls.md)     | `TEM`  | People, roles, policies, audit                            |
| [Design system](specs/design-system.md)             | `DS`   | Brand, charts, motion, accessibility, responsive layout   |

## Reading a spec

Requirements use [EARS](https://alistairmavin.com/ears/) phrasing, so each one names its trigger and the expected response:

> **WHEN** a wire at or above the threshold is created, the system **SHALL** hold it for a second approver.

Each requirement lists how it is verified:

| Label    | Meaning                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------ |
| **Test** | An automated test in this repository, run by `pnpm test`                                         |
| **Run**  | Exercised end to end against the running app, in a browser or over HTTP, with the result checked |
| **Read** | Confirmed by reading the code. Not exercised at runtime                                          |

Acceptance criteria use Given, When, Then for the flows that matter most.

## How a change moves through this repository

1. **Specify.** Add or edit the requirement, with its ID and acceptance criteria. A change that alters behavior starts here.
2. **Plan.** Note design impact in [design.md](design.md) if the change touches a boundary or a decision.
3. **Break down.** Add tasks to [tasks.md](tasks.md), each with a condition that proves it is done.
4. **Implement.** Hand the agent one task with its spec. `packages/contracts` changes first, so both apps compile against the new shape.
5. **Verify.** Run the checks, update the verification label, and review the diff before it merges.

The [constitution](constitution.md) outranks any single spec. A spec that needs to break a rule has to change the rule first, in the open.

## Traceability to the assignment

| Requirement from the assignment | Specs                                                       | Main code                                                                 | Verified                                |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| Modern UI/UX                    | `DS`, `OVW`                                                 | `apps/web/src/components`                                                 | Run, light, dark and 375px              |
| Account overview                | `OVW`, `LED`                                                | `apps/web/src/features/overview`, `apps/api/src/core/ledger`              | Test and Run                            |
| Transaction management          | `TXN`                                                       | `apps/web/src/features/transactions`, `apps/api/src/modules/transactions` | Test and Run                            |
| Data visualization              | `OVW`, `INS`, `CAP`, `DS`                                   | `apps/web/src/components/charts`                                          | Run                                     |
| Functional features             | `PAY`, `CRD`, `BIL`, `INV`, `TEM`                           | `apps/api/src/modules`                                                    | Test and Run                            |
| Technical implementation        | [Constitution](constitution.md), [design](design.md), `PLT` | The whole repository                                                      | Lint, types, tests and production build |
| AI-assisted development         | This folder                                                 | [Root README](../../README.md#ai-assisted-development)                    | Specs trace to code and checks          |
