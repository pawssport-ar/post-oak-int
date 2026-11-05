# Verification

How the specs were checked, and what has not been checked.

## Quality gate

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four pass on Node 22.

## Automated tests

36 tests in 6 files, run by `pnpm test`.

| File                                                     | Tests | Covers                                                       |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| `apps/api/src/core/ledger/ledger.service.spec.ts`        | 4     | Post, hold, settle, release                                  |
| `apps/api/src/seed/seed-data.spec.ts`                    | 6     | Determinism, reconciliation, dates, transfers, ABA           |
| `apps/api/src/modules/payments/approval-policy.spec.ts`  | 6     | Thresholds, new recipients, exemptions                       |
| `apps/api/src/modules/payments/settlement-rules.spec.ts` | 6     | Cut-offs, weekends, arrival by method                        |
| `apps/api/src/modules/capital/readiness.spec.ts`         | 4     | Scores, bands, concentration, multiples                      |
| `apps/api/test/payments.e2e-spec.ts`                     | 10    | HTTP flows: approvals, roles, idempotency, errors, isolation |

## End-to-end runs

Requirements labeled **Run** were exercised against the running app, with each result asserted, using scripts that are not part of this repository.

| Run                        | Checks | Covers                                                                                                                            |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| API flows over HTTP        | 116    | Every module: statements, recipients, quotes, settlement side effects, cards, bills, invoices, forecast, assistant, team, session |
| Interface, headless Chrome | 78     | Every page and flow: forms, drawers, charts, palette, roles, theme, mobile layout, live events                                    |
| Live card activity         | 2      | A frozen card declines a simulated swipe, and an authorized swipe posts 20 seconds later                                          |
| Production smoke test      |        | `pnpm start`: pages, proxy, API reference, CSV, and Server-Sent Events through the web origin                                     |

The palette was checked with an OKLab validator in both themes, for lightness, chroma, colorblind separation and contrast.

## Found by verification

| Finding                                                                  | Resolution                                   |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| Overview and Accounts panels ran past a 375px viewport and were clipped  | Single-column grids below their breakpoints  |
| Stat tiles overflowed on phones                                          | Smaller figures and padding on small screens |
| A stale TypeScript build cache could leave `dist` empty                  | Incremental builds turned off for the API    |
| The demo badge was hidden on small screens, so the guide lost its anchor | The badge now shows at every size            |

## Not covered

| Gap                                  | Status                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Browsers other than Chrome           | Not tested. Safari and Firefox are expected to work but were not checked   |
| Screen readers                       | Not tested. Labels and roles are in place, with no audit behind them       |
| `prefers-reduced-motion`             | Implemented, not exercised                                                 |
| Interface tests in the repository    | The end-to-end runs are not committed. A Playwright suite is the next step |
| Declines by merchant group or limit  | Implemented, not exercised. Only the frozen path was run                   |
| Load and memory under many sandboxes | Not tested. The caps are set from estimates                                |
| Two-service deployment               | Configured, not exercised. Only the single-service layout was run          |
| Security review                      | Not done. This prototype has no authentication, by design                  |
