# Shop and inventory UX validation

Branch: `feat/shop-ux`. Validation resumed on 2026-10-09.

The requested limit is two improvement rounds. Round 1 is recorded in
`0a60491`, `8dc8a63` and `c256b61`; round 2 is recorded in `9de542a` and
`abdf098`. Subsequent changes address integration and payment correctness,
not another design round.

## Initial audit

These were code-review scores, without browser testing.

| Experience | UI | UX |
| --- | ---: | ---: |
| Shop browsing | 6 | 5 |
| Product through checkout | 5.5 | 4 |
| Inventory | 6.5 | 5.5 |

The pass threshold is 8.5 for both UI and UX in every area.

## Final independent source-review scores

| Approved experience | UI | UX | Provisional result |
| --- | ---: | ---: | --- |
| Active Modern shop | 8.5 | 8.5 | Meets source-review threshold |
| Product through checkout | 8.5 | 8.0 | Below threshold |
| Inventory/admin | 8.5 | 8.5 | Meets source-review threshold |

These are provisional assessments, not rendered browser acceptance. The two
design rounds are exhausted. Alternate storefront templates were explicitly
outside the approved implementation scope; they still do not consume all
pagination and filter props from the shared controller.

The funnel loses points because cart problems have no direct edit/remove or
"Edit cart" recovery action inside checkout (`checkout-modal.tsx:599`), and
closing checkout to correct the cart discards the customer's entered contact
and delivery details (`checkout-modal.tsx:125`). These are recorded as remaining
work rather than starting a third design round.

## Integration fixes during final verification

- Staff login restored in the shop footer.
- Back/Forward restores search and price immediately in the same render as
  category/sort, and cancels stale debounce timers. A fake-timer regression
  test covers restoration during an unfinished edit and subsequent typing.
- Managers/cashiers read only tenant currency through a staff-safe query;
  complete tenant settings remain admin-only. Access tests cover all three
  staff roles, non-staff, missing tenant and the admin-only settings boundary.
- Payment verification distinguishes temporary/inconclusive provider errors
  so webhook delivery retries rather than acknowledging a pending paid order.
- Finalization rechecks the winner after its conditional status update loses,
  including cancellation during provider verification.
- Stock-shortfall evidence is persisted in the same transaction as completion
  and stock deductions, so later cancellation cannot restore undeducted stock
  because a post-commit notification failed.

## Validation evidence

- Initial full test run: 57 files, 300 tests passed.
- Final standard suite: 59 files passed, 313 tests passed; 11 disposable
  PostgreSQL integration cases skipped by default.
- Separate disposable PostgreSQL payment suite: all 11 cases passed. It covers
  provider HTTP/JSON/transport failures, inconclusive status, cancellation
  during verification, stock-shortfall cancellation, atomic rollback and
  concurrent finalizers. Paystack HTTP and email were mocked. The temporary
  PostgreSQL container was removed; no shared/production database writes.
- Final standalone `npm run typecheck`: passed.
- Focused lint for integration/payment changes: no errors. One preexisting
  unused-secret-destructuring warning remains in the settings router.
- Full `npm run check`: failed at lint with 203 errors across the repository;
  this command therefore did not reach TypeScript. Focused lint and the
  standalone typecheck are tracked separately.
- Local development server: `http://localhost:3010`.
- Anonymous `GET /inventory`: 307 redirect to `/`.
- Malformed `POST /api/paystack/webhook`: 400.
- Unauthorized `GET /api/cron/expire-checkouts`: 401.
- Initial TCP database connection: `ETIMEDOUT`, with `GET /shop` returning 500.
  A read-only WebSocket connection succeeded. Restarting only the local
  preview with `DATABASE_TRANSPORT=websocket` produced a 200 shop response
  containing 24 real product cards and catalogue total 503, and a 200 product
  page containing price, quantity and purchase controls. No `.env` changes.
- Filtered browse returned HTTP 200 but only loading skeletons after database
  prefetch errors. This is not a successful filtered-results check.
- Browser automation inventory: no connected browser or app. Desktop/mobile
  visual checks and authenticated manager workflows have not been verified.

Unit tests and source review do not establish a browser UX pass or prove
live provider behavior. The separate suite exercises actual PostgreSQL
transactions; browser checkout, live Paystack, email delivery and existing
pre-fix order reconciliation remain unverified.

## Activation requirements

- Migration `drizzle/0015_high_bushwacker.sql` adds the payment reference and
  unique tenant/reference index. No production migration was run in this
  resumed session. Confirm deployed migration state before activating payment
  changes; production migration requires the user's explicit approval.
- Configure the store's Paystack webhook to
  `https://www.sppdamaks.com/api/paystack/webhook` after deploying the route.
- Set `CRON_SECRET` and ensure the expiry cron is actually scheduled on the
  hosting platform; `vercel.json` alone does not configure other hosts.
- Exercise checkout with Paystack test credentials and a non-production
  database, including browser-close recovery, replay, concurrent cancellation,
  and stock-shortfall cancellation.
- Verify desktop and 390px layouts, keyboard dialogs, search/filter/history,
  pagination, cart quantities, checkout summaries, and manager product/stock
  workflows when a browser and database are available.

The instance-local rate limiter is best-effort; trusted proxy headers and a
shared rate-limit store require deployment verification. Anonymous pickup
reservations currently lack automatic expiry and can hold stock indefinitely.
