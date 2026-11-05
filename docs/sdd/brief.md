# Product brief

## Context

The Post Oak Group is a Houston investment bank serving the middle market, with M&A and capital markets advisory under one roof. It is building a digital banking platform for business clients: web and mobile, onboarding, ACH and wires, debit cards, bill pay, invoicing, reporting, permissions and admin tooling, on top of a banking-as-a-service provider.

The assignment asks for a modern banking dashboard, inspired by platforms such as Mercury or Slash but with an original implementation, covering:

- A clean, responsive, professional interface
- Account balances, financial summaries and cash position
- Transaction history with filtering, search, details and realistic sample data
- Interactive charts of activity, spending, cash flow or performance
- Working interactive features that show how a real platform might operate
- Modern frameworks and clean, scalable code

Deliverables are a working application, the source code, and a short note on technologies and AI tools.

## Product thesis

Mercury and Slash compete on software. Post Oak's edge is that it is an investment bank.

A client's operating account already holds what a deal team asks for first: liquidity, growth, margins, customer concentration and collections. So this concept treats banking data as an asset. The everyday product earns the relationship, and the Capital page connects it to the advisory business.

Everything else follows from that: an interface that feels institutional rather than startup, controls a finance team trusts, and reporting that reads like a treasury memo.

## Who it serves

The sample client is **Brazos Gulf Logistics**, a fictional Houston freight company with about $42M in annual receipts and $8.4M in cash.

| Persona                  | Role                      | Cares about                                                     |
| ------------------------ | ------------------------- | --------------------------------------------------------------- |
| Elena Vasquez            | Owner, CEO                | Where the company stands, approving what matters, its next move |
| Marcus Reed              | Finance admin, CFO        | Cash position, approvals, card limits, forecasts                |
| Priya Nair               | Bookkeeper, Controller    | Preparing payments, categorizing, invoicing                     |
| Hannah Cole, Jordan Tate | Cardholders               | Their own cards and spend, nothing else                         |
| Reviewer                 | Evaluating the case study | Seeing the best parts in five minutes, safely                   |

## Goals

1. Meet every requirement in the assignment, with depth where a reviewer will look first.
2. Look unmistakably like Post Oak: its green, its Garamond, its column.
3. Show engineering judgment a real banking platform needs: a ledger, approvals, idempotency, audit, a provider boundary.
4. Let anyone try everything without a login, an account or fear of breaking it.
5. Mirror the real roadmap, so the prototype reads as the first slice of the platform.

## Scope

**In scope:** accounts, ledger, transactions, ACH, wire, instant and internal payments, approvals, recipients, debit cards and controls, bills, invoices, reporting, forecasting, capital readiness, roles, policies, audit log, live events, responsive web, light and dark themes.

**Out of scope for this prototype:**

| Not built                              | Why                                                                   |
| -------------------------------------- | --------------------------------------------------------------------- |
| Authentication and MFA                 | Reviewers should land on the dashboard. Personas stand in for it      |
| Real money or a real provider          | Mock data by request. The `BaasProvider` port is the seam             |
| Business onboarding and KYB            | Needs a provider and a compliance design                              |
| iOS and Android apps                   | The assignment is a dashboard. `packages/contracts` is ready to share |
| Persistence                            | In-memory sandboxes keep every reviewer isolated                      |
| A job that releases scheduled payments | Scheduling is shown up to the point of release                        |

## Success criteria

| ID   | Criterion                                                                                   |
| ---- | ------------------------------------------------------------------------------------------- |
| SC-1 | Every assignment requirement traces to a spec, to code and to a check                       |
| SC-2 | A first-time visitor sees real data on the dashboard with no sign-in                        |
| SC-3 | A payment can be created, approved by a second person and watched to settlement             |
| SC-4 | Two visitors at the same time never see each other's changes                                |
| SC-5 | The product is usable at 375px wide and in both themes                                      |
| SC-6 | `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` all pass                        |
| SC-7 | It is clear everywhere that the data is fictional and this is a case study, not a live bank |

## Honesty rules for a branded prototype

This concept uses Post Oak's brand, so it has to be impossible to mistake for a live service:

- A demo badge is always visible, and every page carries a footer naming the author and stating the data is fictional.
- There is no login form, so nothing can collect credentials.
- There is no claim of FDIC coverage, a partner bank or a real advisor. People and companies are invented, and the advisor is labeled as a sample flow.
- Search engines are told not to index it.
- Firm statistics on the Capital page are quoted from postoakgroup.co and attributed.
