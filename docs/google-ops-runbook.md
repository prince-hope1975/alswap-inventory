# Google ops runbook — Search Console, Business Profile, Merchant Center, Ads

Companion to `docs/domain-cutover.md`, which covers the domain/env side. This
covers the external consoles, sequenced so nothing is submitted against a
config that will invalidate it.

Verified state as of the last check (2026-08-02):

| Thing | State |
|---|---|
| `www` / `shop` / `solar` / `used` / `app` `.sppdamaks.com` | TLS live, all serving |
| `COMMERCE_SUBDOMAIN` | `shop` — confirmed live, canonicals point at `shop.sppdamaks.com` |
| `AUTH_COOKIE_DOMAIN` | `.sppdamaks.com`, set in Vercel — see Step 0 for the Preview-scope caveat |
| `/api/feed/google` | 200, well-formed, links on `shop.sppdamaks.com` — but **only 12 items** |
| Products with an image | **12 of 503** |
| `robots.txt` / `sitemap.xml` | Live and correct on every surface; `app.` is `Disallow: /` |

---

## Step 0 — `AUTH_COOKIE_DOMAIN` (done, with one caveat)

`AUTH_COOKIE_DOMAIN=.sppdamaks.com` is set in Vercel and live. The one-time
logout it causes (the session cookie moves from host-scoped to root-scoped, so
existing sessions stop being recognised) has already happened.

**Caveat: it is scoped to Production *and Preview*.** Preview deployments serve
on `*.vercel.app`, and a browser rejects a `Set-Cookie` whose `Domain` is a
different registrable domain than the host that sent it — so no session cookie
is stored and sign-in fails silently on every preview URL. If PRs are tested on
preview links, drop Preview from that variable's scope.

The var is not detectable from outside: `src/server/auth/auth.config.ts:19`
applies the domain to `sessionToken` only, and the csrf/callback cookies keep
their default `__Host-`/`__Secure-` names either way. Verify in a browser
instead — sign in on `https://app.sppdamaks.com`, check DevTools → Application
→ Cookies for `__Secure-authjs.session-token` with `Domain=.sppdamaks.com`,
then load `https://shop.sppdamaks.com` and confirm the session persists.

---

## Step 1 — Fix the catalog (blocks Merchant Center entirely)

**Do not create a Merchant Center account until this is done.** 491 of 503
products have `image = null`. `image_link` is a hard-required Merchant Center
attribute; an item without one is disapproved, not warned. Submitting a
12-item feed burns the account's initial review on a catalog that does not
represent the business.

The feed filter is `src/lib/seo/feed.ts:14` — a product appears only if all
four hold:

```
visibility = 'PUBLISHED'  AND  feed_eligible = true
AND stockQuantity <> 0    AND  image IS NOT NULL
```

Only the last one is failing. Work in this order:

1. **Images — required.** Upload via the inventory admin. Target the products
   that actually sell first; the feed grows automatically as images land, no
   redeploy needed (`/api/feed/google` is `force-dynamic`).
2. **`brand` — strongly recommended.** Currently null on all 503. The feed
   emits `<g:identifier_exists>no</g:identifier_exists>`, which makes brand and
   GTIN formally optional, but Merchant Center's product ranking and the
   "brand" filter in Shopping both use it. Without it items compete poorly.
3. **`google_product_category`** — null on all 503. Google will infer a
   category, but the inference is bad for electrical parts and directly
   controls which Shopping queries the item can match. Set it on at least the
   top categories.
4. **`condition`** — every product is `NEW`, so `used.sppdamaks.com` has
   nothing to show (its sitemap has 3 urls, none of them products). Either tag
   the genuinely used stock as `USED`/`REFURBISHED`, or accept that the `used.`
   surface stays empty and do not submit it to Search Console yet.

Re-check progress at any time:

```sh
curl -s https://shop.sppdamaks.com/api/feed/google | grep -c '<item>'
```

Move to Step 3 when that number is a fair representation of the catalog.

---

## Step 2 — Search Console (do now, independent of Step 1)

1. Add **`sppdamaks.com` as a Domain property** — not a URL-prefix property.
   Domain covers the apex and every subdomain in one go, including `shop.`,
   `solar.` and `used.`, which is what makes the multi-surface setup
   measurable.
2. Verification is a DNS TXT record at the zone root. Add it in Cloudflare
   alongside the existing `_dmarc` / SPF / DKIM records. **Do not delete the
   existing TXT records** — a name can hold several TXT values.
3. Submit sitemaps. They differ per surface, so submit each one that has real
   content:

   | Sitemap | URLs | Submit? |
   |---|---|---|
   | `https://shop.sppdamaks.com/sitemap.xml` | 506 | Yes — primary |
   | `https://www.sppdamaks.com/sitemap.xml` | 506 | Yes — after the `www` fix below is deployed |
   | `https://solar.sppdamaks.com/sitemap.xml` | 1 | Yes, but thin — see below |
   | `https://used.sppdamaks.com/sitemap.xml` | 3 | Not yet — nothing to index |

   `app.sppdamaks.com` is `Disallow: /` plus `X-Robots-Tag: noindex` — never
   submit it.

   **The `www` fix:** the sitemap served on `www` used to list bare-apex URLs
   (`https://sppdamaks.com/shop`), and the apex 308-redirects to `www` — so
   every page entry was a redirect, which Search Console excludes as "Page
   with redirect". Fixed in `src/lib/seo/host.ts` (`baseUrlFromHost` now keeps
   `www`). Confirm before submitting:

   ```sh
   curl -s https://www.sppdamaks.com/sitemap.xml | grep -m1 -oE '<loc>[^<]+'
   # expect https://www.sppdamaks.com — not https://sppdamaks.com
   ```
4. Keep the old `sppd.amachree.dev` property registered until its 301s have
   been crawled through. Deleting the property does not speed up the move and
   loses the redirect telemetry.
5. `solar.` has exactly one indexable URL (its own homepage) because there are
   no articles yet. It will not rank on solar keywords with one page. Articles
   are the fix, and they are also what the `Service` JSON-LD on `/solar` is
   there to support.

---

## Step 3 — Google Business Profile (start early, it has a lag)

Start this **in parallel** with Step 1 — verification is postcard or video and
takes 1–2 weeks. Nothing downstream can be rushed once it is pending.

- One profile. Primary category **Electronics store**; secondary categories for
  solar and electrical supply.
- Address and hours must match what the site says on `/find-us`, or the
  profile gets flagged during review.
- The **store code** GBP assigns is what the Local Inventory feed needs. Note
  it down when it appears.

---

## Step 4 — Merchant Center (only after Steps 1 and 3)

1. Create the account.
2. Verify and claim **`shop.sppdamaks.com`** — exactly this host. It must match
   `COMMERCE_SUBDOMAIN=shop`, because every `<link>` in the feed points there.
   Claiming the apex instead fails the claim check on every single item.
3. Link the verified GBP profile.
4. Add the primary feed: `https://shop.sppdamaks.com/api/feed/google`,
   scheduled fetch. Use **Fetch now** once and read the diagnostics before
   enabling the daily schedule. Target zero disapprovals.
5. **Do not add `/api/feed/local-inventory` yet.** Its `store_code` column
   currently falls back to `tenant.slug`
   (`sppd-amaks-1765111956344`) — see `src/app/api/feed/local-inventory/route.ts:12`.
   That is a placeholder. Submitting it before the real GBP store code exists
   creates a store mapping that has to be unpicked later. Once GBP issues the
   code, replace the fallback in that route, redeploy, then submit.
6. Local Inventory Ads have historically been **paid-only in Nigeria**, with
   free local listings unavailable in this market — confirm current
   availability in the Merchant Center help centre before planning around it,
   as Google changes market coverage. If it is still paid-only, this feed is ad
   infrastructure rather than an organic discovery path, and is only worth
   wiring up if Ads spend is actually planned.

---

## Step 5 — Google Ads (last)

Link Merchant Center only once feed items are approved — linking earlier just
surfaces the disapprovals in a second console.

One account, campaigns split by surface:

- **Shopping** — electronics and used stock, driven by the Merchant Center feed.
- **Search + Performance Max** — solar keywords, landing on `/solar` and its
  lead form rather than a product page.

---

## Order summary

```
Step 0  AUTH_COOKIE_DOMAIN         now, logs everyone out once
Step 1  product images + brand     blocks Merchant Center — longest task
Step 2  Search Console             now, parallel with Step 1
Step 3  Business Profile           now, parallel — 1-2 week verification lag
Step 4  Merchant Center            after 1 and 3
Step 5  Google Ads                 after 4 approves
```
