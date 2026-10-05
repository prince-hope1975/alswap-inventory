# Search and AI visibility runbook

This runbook covers the operator work that cannot be completed from the codebase alone. It complements `docs/google-ops-runbook.md`.

## 1. Deploy and verify the technical release

1. Apply migration `0013_category-seo` before deploying the application. It adds category descriptions, backfills stable category slugs, and creates the tenant/slug uniqueness index.
2. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-...` in the production environment. Analytics remains off until a visitor grants consent.
3. Confirm the production endpoints:

   ```sh
   curl -s https://shop.sppdamaks.com/robots.txt
   curl -s https://shop.sppdamaks.com/sitemap.xml | grep -c '<url>'
   curl -A OAI-SearchBot -I https://shop.sppdamaks.com/guides
   curl -A GPTBot -s https://shop.sppdamaks.com/robots.txt
   ```

   `OAI-SearchBot` must be allowed on public pages. `GPTBot` must be disallowed. `app.sppdamaks.com` remains blocked for every crawler.

   AI search and assistant agents (`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, `Perplexity-User`) each get the public allow list and the private-path disallow list. Check `/llms.txt` as well:

   ```sh
   curl -s https://shop.sppdamaks.com/llms.txt
   ```

   It must list the real address, phone, categories with stock and guides. It is generated from store data, so fix any gap in **Store Customization** or the category descriptions, not in code.

4. Test one product, category, guide, About, and Find Us URL in Google Rich Results Test. Structured data must agree with visible names, prices, stock, address, hours, and descriptions.

## 2. Complete the store identity

In **Inventory → Settings → Store Customization**, fill in:

- a factual business description;
- the towns actually served;
- current opening days and hours;
- only social or directory profiles controlled by the business;
- the exact address, phone, logo, and map point used by the Google Business Profile.

Do not add certifications, service areas, opening hours, or profile links that cannot be verified.

## 3. Search Console and Business Profile

1. Audit or create the Search Console **Domain property** for `sppdamaks.com`.
2. Submit `shop`, `www`, and `solar` sitemaps. Do not submit `app`; do not submit `used` until it has real used/refurbished stock.
3. Inspect the homepage, `/guides`, `/find-us`, `/solar`, the six priority category pages, and representative products.
4. Audit or claim one Google Business Profile. Keep the business name exactly `SPPD AMAKS`. Start with **Electronics store** as the primary category and use only truthful electrical-supply or solar secondary categories available in the console.
5. Align address, phone, hours, map point, website, photos, and services with the website. Ask real customers for reviews after completed purchases or installations; do not incentivize or gate reviews.
6. Correct inconsistent directory names such as `Sppd Amak's`. Build only legitimate local, supplier, manufacturer, and business-directory citations.

## 4. Product readiness and Merchant Center gate

The Products screen now shows a seven-point readiness score. Enrich the top 50 active products first. Each must have:

- a real product image;
- a useful description of at least 40 characters;
- a category with a public description;
- a brand, SKU, GTIN, or MPN;
- an accurate nonnegative price;
- current availability;
- a clear, specific name.

Create or connect Merchant Center only when those 50 products are ready and the primary feed has no critical errors. Claim `shop.sppdamaks.com`, fetch `/api/feed/google`, and keep local inventory disconnected until the real Google Business Profile store code exists.

## 5. Three-month publishing schedule

Publish two original guides per month from **Inventory → Articles**. Use headings, lists, comparison tables, original local photos where possible, a real byline, and relevant category/product links.

1. Electrical supplies in Warri and Jeddo: cables, lighting, protection, and tools.
2. Solar system sizing for homes and shops in Warri.
3. Stabiliser vs voltage guard vs surge protector.
4. What to check before buying an inverter battery in Nigeria.
5. How to prepare an electrical materials list or bill of quantities.
6. Choosing replacement chargers and cables safely.

Pick the next topics from the Demand page (**Inventory → Demand**). Searches with no results and rising Trends terms are what people in the area are already looking for. Research from October 2026 (Delta State) points to:

7. Lithium battery prices in Warri: 100Ah vs 200Ah, and 2.5kWh vs 15kWh LiFePO4.
8. Hybrid inverter buying guide (Deye, Felicity, Itel), including 3.5kVA and 5kVA sizing questions.
9. Solar generators (portable power stations) vs a solar installation.
10. Solar fan vs rechargeable fan before the dry season.
11. Choosing a fridge or deep freezer in Warri, including solar fridges.

Nigerian searchers add "price in nigeria" to product names. Product and category titles now follow that pattern automatically when a price is shown. In guides, use the exact phrases people search for and link to the matching category.

Every technical statement must be checked by someone qualified for the subject. Do not invent prices, certifications, customer results, safety guarantees, or availability.

## 6. Monthly measurement

- Search Console: indexed priority URLs, branded and non-branded impressions, clicks, average position, and query growth.
- Google Business Profile: discovery searches, calls, direction requests, and website visits.
- GA4: `search`, `add_to_cart`, `begin_checkout`, `purchase`, `generate_lead`, `click_call`, and `click_whatsapp`.
- ChatGPT: traffic with `utm_source=chatgpt.com` and a repeatable benchmark of branded, local, product, and solar prompts.

AI citations and rankings are not guaranteed. Judge progress by eligibility, accurate indexation, useful citations, qualified traffic, and conversions over 30-, 60-, and 90-day windows.
