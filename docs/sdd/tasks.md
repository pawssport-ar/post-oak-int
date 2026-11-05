# Tasks

The work, as tasks an agent can take one at a time. Each task names its spec and the condition that proves it is done.

## M1: Foundation

- [x] **T-01 Workspace.** pnpm workspace with `apps/web`, `apps/api` and `packages/contracts`. _Done when:_ `pnpm install` and `pnpm build` pass from a clean clone.
- [x] **T-02 Contracts.** Domain types, Zod schemas and the permission model. _Spec:_ all. _Done when:_ both apps compile against the package.
- [x] **T-03 Sandbox store.** Per-visitor workspaces with a TTL and an LRU cap. _Spec:_ PLT-2 to PLT-6. _Done when:_ `isolates sandboxes from each other` passes.
- [x] **T-04 Guards and errors.** Workspace and permission guards, Zod pipe, problem documents. _Spec:_ PLT-13, PLT-20, PLT-21. _Done when:_ `enforces roles on the server` and `rejects invalid input with field-level detail` pass.
- [x] **T-05 Ledger.** Post, hold, settle, release. _Spec:_ LED-1 to LED-5. _Done when:_ the four ledger tests pass.
- [x] **T-06 Seed.** Fourteen deterministic months for Brazos Gulf Logistics. _Spec:_ PLT-7, PLT-8, LED-6 to LED-8. _Done when:_ the six seed tests pass.

## M2: Money movement

- [x] **T-07 Provider port.** `BaasProvider` and the mock adapter. _Spec:_ PAY-23. _Done when:_ a payment reaches settled through provider events alone.
- [x] **T-08 Settlement rules.** Fees, cut-offs, arrival dates. _Spec:_ PAY-2 to PAY-4. _Done when:_ the six settlement tests pass.
- [x] **T-09 Approval policies.** _Spec:_ PAY-10 to PAY-14. _Done when:_ the six policy tests pass.
- [x] **T-10 Payments service.** Quote, create, approve, reject, cancel. _Spec:_ PAY-1, PAY-5 to PAY-8, PAY-15 to PAY-18, PAY-24 to PAY-28. _Done when:_ the payments end-to-end tests pass.
- [x] **T-11 Idempotency.** _Spec:_ PAY-20. _Done when:_ `replays the original response` passes.
- [x] **T-12 Recipients.** ABA checksum, bank lookup, duplicates. _Spec:_ PAY-40 to PAY-43. _Done when:_ a bad routing number fails and a new recipient is held for review.

## M3: Banking features

- [x] **T-13 Accounts and statements.** _Spec:_ LED-10 to LED-22. _Done when:_ statements chain and download as CSV.
- [x] **T-14 Transactions API.** _Spec:_ TXN-1 to TXN-4, TXN-16, TXN-20, TXN-21. _Done when:_ `filters and summarises the ledger` passes.
- [x] **T-15 Cards.** _Spec:_ CRD-1 to CRD-5, CRD-10 to CRD-13, CRD-30 to CRD-33. _Done when:_ card lists carry no secrets and cardholders see only their own.
- [x] **T-16 Bills.** _Spec:_ BIL-1 to BIL-10. _Done when:_ paying a bill creates a payment that obeys policies.
- [x] **T-17 Invoices.** _Spec:_ INV-1 to INV-13. _Done when:_ marking paid moves the balance by exactly the total.
- [x] **T-18 Team, policies and audit.** _Spec:_ TEM-1 to TEM-13. _Done when:_ a policy change alters the next quote.

## M4: Intelligence

- [x] **T-19 Reporting.** Overview, balance history, cash flow, spending. _Spec:_ INS-10 to INS-13. _Done when:_ transfers are excluded and periods compare.
- [x] **T-20 Forecast.** _Spec:_ INS-1 to INS-8. _Done when:_ the stress test breaches the floor.
- [x] **T-21 Treasury sweep.** _Spec:_ LED-30 to LED-33. _Done when:_ accepting it moves the suggested amount.
- [x] **T-22 Capital readiness.** _Spec:_ CAP-1 to CAP-5. _Done when:_ the four readiness tests pass.
- [x] **T-23 Assistant and search.** _Spec:_ INS-21, INS-23 to INS-26. _Done when:_ known questions answer from the ledger and others do not guess.

## M5: Live layer

- [x] **T-24 Event stream.** _Spec:_ PLT-30, PLT-31. _Done when:_ events reach a connected client within seconds.
- [x] **T-25 Activity simulator.** _Spec:_ PLT-34, CRD-20 to CRD-23, INV-11. _Done when:_ a frozen card declines a simulated swipe.
- [x] **T-26 Web proxy.** Sandbox cookie and backend-for-frontend. _Spec:_ PLT-1, PLT-22, PLT-40 to PLT-43. _Done when:_ Server-Sent Events stream through the web origin in a production build.

## M6: Interface

- [x] **T-27 Design system.** Tokens, type, primitives, brand assets. _Spec:_ DS-1 to DS-5, DS-30 to DS-33. _Done when:_ both themes render every primitive.
- [x] **T-28 App shell.** Sidebar, top bar, mobile navigation, palette, notifications, personas. _Spec:_ PLT-14, PLT-15, PLT-33, INS-20, INS-22, DS-41. _Done when:_ a role switch reshapes navigation.
- [x] **T-29 Charts.** Balance, cash flow, forecast, ranked bars, aging, portico. _Spec:_ DS-10 to DS-15, CAP-6. _Done when:_ the palette passes validation in both themes.
- [x] **T-30 Overview.** _Spec:_ OVW-1 to OVW-15. _Done when:_ scrubbing works by pointer and keyboard.
- [x] **T-31 Transactions.** _Spec:_ TXN-5 to TXN-15, TXN-22, TXN-23. _Done when:_ a filtered deep link with an open drawer survives a reload.
- [x] **T-32 Send money.** _Spec:_ PAY-21, PAY-30 to PAY-34. _Done when:_ a wire goes from creation to settlement across two personas.
- [x] **T-33 Cards.** _Spec:_ CRD-2, CRD-3, CRD-6, CRD-14, CRD-15. _Done when:_ limits, toggles and freeze apply in place.
- [x] **T-34 Accounts, bills and invoices.** _Spec:_ LED-11 to LED-13, LED-32, BIL-1 to BIL-6, INV-1 to INV-6, INV-14. _Done when:_ each flow completes in the browser.
- [x] **T-35 Insights.** _Spec:_ INS-2 to INS-7, INS-10 to INS-14. _Done when:_ levers update the chart and the floor check.
- [x] **T-36 Capital.** _Spec:_ CAP-6 to CAP-15. _Done when:_ pillars explain themselves on hover and in the table.
- [x] **T-37 Team and controls.** _Spec:_ TEM-1 to TEM-12. _Done when:_ every tab works for an owner and trims for other roles.
- [x] **T-38 Reviewer guide and honesty.** _Spec:_ DS-50 to DS-52. _Done when:_ the guide opens once and the demo label shows at every size.

## M7: Ship

- [x] **T-39 Responsive pass.** _Spec:_ DS-40 to DS-43. _Done when:_ all ten pages fit 375px with nothing clipped.
- [x] **T-40 Quality gate.** Lint, types, tests, production build. _Spec:_ SC-6. _Done when:_ all four pass with Node 22.
- [x] **T-41 Deployment.** Single-service start script and per-app Railway config. _Spec:_ PLT-44 to PLT-46. _Done when:_ `pnpm build` and `pnpm start` serve the full product locally.
- [x] **T-42 Documentation.** README and these specs. _Done when:_ every assignment requirement traces to a spec, code and a check.
