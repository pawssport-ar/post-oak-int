# Constitution

The rules that outrank any single spec. Each one exists because breaking it causes a class of bug that is expensive in banking software.

## Money

1. **Money is an integer number of cents.** No floats in storage, in contracts or in arithmetic on balances. Formatting happens at the edge.
2. **One door to the ledger.** Balances change only through `LedgerService`. No module writes a balance directly.
3. **The ledger reconciles.** For every account, `balance` equals opening balance plus posted entries, and each entry's `balanceAfter` proves it.
4. **Pending is not posted.** A hold reduces available funds and leaves the ledger balance alone until it settles.

## Moving money

5. **Quote before you commit.** Fees, arrival, approvals and warnings come from the server. The interface never calculates them.
6. **Retries are safe.** Money-moving requests accept an `Idempotency-Key`, and a repeated key replays the first response.
7. **Maker-checker has no exceptions.** Nobody approves their own payment, whatever their role.
8. **A status moves forward through events.** Provider events drive payments after submission. The interface never assumes a result.

## Boundaries

9. **Contracts first.** Types, schemas and the permission model live in `packages/contracts`. A change to a shape starts there, and both apps follow.
10. **The domain never sees a provider.** Services call the `BaasProvider` port. Swapping providers touches an adapter and one line of wiring.
11. **The browser talks to one origin.** Everything goes through the web app's proxy, so there is no CORS and the sandbox cookie stays `httpOnly`.

## Security

12. **The server enforces, the interface reflects.** Hiding a button is courtesy. Every protected route declares its permission and the API checks it.
13. **Sensitive reads leave a trace.** Revealing an account or card number, moving money and changing controls all write to the audit log.
14. **Secrets stay out of lists.** Full card numbers and CVCs never appear in list or detail responses, only in an explicit, audited reveal.
15. **Validate at the edge.** Every body and query is parsed against a contract schema. Failures return RFC 9457 problem documents with field detail.

## Experience

16. **Say what is true.** The demo is labeled as a demo. No invented regulatory claims, no real people as sample data.
17. **Every value is reachable without a mouse.** Chart values have keyboard or table access, and motion respects `prefers-reduced-motion`.
18. **Color never carries meaning alone.** Status pairs color with a label. Chart palettes are validated for color-vision deficiency.
19. **Refetching keeps the frame.** Data updates in place with no layout jump or flash.

## Code

20. **Strict TypeScript.** `any` is banned in the API. `noUncheckedIndexedAccess` is on.
21. **Comments explain why.** Code says what it does. A comment earns its place by saying why.
22. **Done means verified.** A task closes when its check passes, not when the code compiles.
