# Domain cutover: `sppd.amachree.dev` → `sppdamaks.com`

The code is domain-agnostic. Nothing below is a code change — it is DNS, one
database field, and two environment variables, in a specific order.

Do **not** set any of the three config values early, including in `.env.local`
"just to test". `COMMERCE_SUBDOMAIN=shop` in local development makes every
canonical point at `shop.localhost`, which looks like a regression the next
time anything is verified by curl.

## What each value does

| Value | Where | Effect when set |
|---|---|---|
| `tenants.customDomain` | database (Settings → Store) | Which host resolves to this tenant. Single-valued: the moment it changes, the old host stops resolving in-app. |
| `COMMERCE_SUBDOMAIN` | env | Host that every canonical, JSON-LD `url`/`offers.url`, and Merchant Center feed `link` points at. Unset = the root domain itself. |
| `AUTH_COOKIE_DOMAIN` | env | Scopes the session cookie to the root so a session on `app.` is sent to `shop.`. **Also switches the cookie name to `__Secure-authjs.session-token`, which logs every user out once.** |

## Order

1. **Buy `sppdamaks.com`.** Point the apex `A`/`ALIAS` at the host, and add a
   wildcard `CNAME *.sppdamaks.com` for the surfaces.
2. **Add the domain in Vercel and wait for certificate issuance.** The wildcard
   cert needs DNS validation and typically lands later than the apex. This is
   the step that runs long.
3. **Verify TLS before touching anything else.** Both must serve:
   `https://sppdamaks.com` and `https://shop.sppdamaks.com`.
4. **Configure the 301 on the old host** — `sppd.amachree.dev` →
   `sppdamaks.com`, path-preserving, so the authority already built transfers
   rather than being abandoned. Add `www.sppdamaks.com` → apex while here;
   `www` normalizes away in-app, but the redirect keeps one host canonical at
   the edge.
5. **Update `tenants.customDomain` to `sppdamaks.com`.**

   Steps 4 and 5 are the tight window. Do 4 first: between them the old host
   resolves to no tenant, and a 301 pointing at a working new domain beats
   serving `PublicStoreUnavailable`.
6. **Set `COMMERCE_SUBDOMAIN=shop`, redeploy.** Every canonical moves to
   `shop.sppdamaks.com` from this point.
7. **Set `AUTH_COOKIE_DOMAIN=.sppdamaks.com`, redeploy.** Everyone is logged
   out once. Schedule it deliberately.

## Verify after

- `curl -sIL https://sppd.amachree.dev/products/<slug>` — 301s to the same path
  on the new root.
- `curl -sI https://app.sppdamaks.com/` — 307 to `/auth/signin`, and
  `X-Robots-Tag: noindex, nofollow`. It must **not** loop.
- `curl -s https://used.sppdamaks.com/ ` — serves the shop pre-filtered to
  non-new stock.
- A product page on `used.` must canonicalise to `shop.sppdamaks.com`, never to
  `used.`. Same for the sitemap entries.
- Sign in on `app.`, then load `shop.` — session persists (only true after
  step 7).

## Search Console / Merchant Center

- Add `sppdamaks.com` as a **Domain** property; it covers every surface.
- Keep the old property until the 301s have been crawled through.
- Merchant Center claims **one** domain — claim `shop.sppdamaks.com`, matching
  `COMMERCE_SUBDOMAIN`, or feed items will fail the claim check.
