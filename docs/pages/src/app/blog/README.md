# Owned SPPD AMAKS blog

## Routes and source

- `src/app/blog/page.tsx`: public article index, Blog structured data and canonical metadata.
- `src/app/blog/[slug]/page.tsx`: full article, BlogPosting/Breadcrumb structured data, related posts and a real 404 for unknown slugs.
- `src/app/blog/blog-server.ts`: cached request context and tenant ownership gate. Other tenants never receive this brand's copy.
- `src/app/blog/blog-view.tsx`: responsive server-rendered reading layout, safe Markdown subset, horizontally scrollable tables, navigation and telephone/shop CTAs. No client-side content fetch is needed for crawlers.
- `src/content/blog/posts.json`: the six published-content records, extracted from the previously prepared drafts. No draft instructions or invented photographs are exposed.
- `src/lib/content/blog.ts`: canonical URL, tenant selection and sitemap helpers.

The six articles cover the business story, an electrical shopping checklist, the solar expansion, solar quotation preparation, appliance delivery and the product range. The solar article is general enquiry preparation, not a design specification or an assertion of professional technical approval.

## Update or add an article

Edit the source JSON using the same record shape. Keep slugs stable once published. Use an accurate `publishedAt`, advance `updatedAt` only for substantive edits, and recalculate `minutes` from the body. A new record appears in the index and sitemap automatically. Confirm brand facts, current stock and technical wording before releasing changes. Update collection-count assertions when adding a later batch.

Run:

```sh
pnpm exec vitest run src/lib/content/blog.test.ts src/app/blog/blog-view.test.tsx src/lib/seo/host.test.ts
pnpm typecheck
pnpm build
```

## Domain mapping

Without `BLOG_SUBDOMAIN`, all blog URLs canonicalize to the main `www` host at `/blog` and `/blog/<slug>`, including copies requested from shop/solar. This allows immediate publication on the existing mapped site.

To use the separate surface requested by the owner:

1. Attach `blog.sppdamaks.com` to the **existing** Vercel project serving `www`, shop and app. Do not create another application or change those existing domains.
2. Add only the `blog` DNS record using the precise target Vercel shows for that domain. Do not guess a target or replace unrelated records.
3. Verify public DNS, HTTPS and an anonymous HTTP 200 for the root and article paths.
4. Set `BLOG_SUBDOMAIN=blog` in Production and redeploy. Keep it unset in local development and previews until their mapping is deliberately configured.
5. Confirm the index canonical is `https://blog.sppdamaks.com/`, article canonicals are `https://blog.sppdamaks.com/blog/<slug>`, and every sitemap URL matches.

This follows the existing surface convention: only `/` rewrites. Article paths remain `/blog/<slug>` on the new host. The private `app.` surface remains blocked and noindex.

## Google discovery and confirmation

The public sitemap includes all six articles and the canonical index. Robots advertises the host's sitemap and does not block the blog. These are discovery mechanisms, **not confirmed indexing**. Google does not guarantee inclusion even for technically eligible pages.

After deployment:

1. Check every canonical URL anonymously for HTTP 200, full body text, title/description, canonical and absence of a noindex response header. Check an unknown slug returns 404.
2. In the existing Search Console **Domain property `sppdamaks.com`**, submit the main-site sitemap; after subdomain activation also submit `https://blog.sppdamaks.com/sitemap.xml`.
3. Inspect each of the six canonical article URLs, run the live test and request indexing. A successful request is not evidence of inclusion.
4. Recheck URL Inspection and Page Indexing in 7–14 days and again around 30 days. Record Google's selected canonical, index verdict, last crawl, errors and the date of the check.
5. Investigate actual exclusions (blocked/noindex/redirect/server errors/duplicate canonical) instead of repeatedly submitting unchanged URLs. Do not use Google's restricted Indexing API for ordinary blog posts.

References: [Google sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [request recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [technical requirements](https://developers.google.com/search/docs/essentials/technical).

## External republication

Use the owned article's final canonical URL as the reference for external posts. Prefer a distinct adapted article that links to this useful original. If republishing an identical article on a platform that supports external canonicals, set that platform's canonical to the owned article. Do not change the owned canonical to WordPress/Medium/Blogger. Keep publication and indexing evidence separate in the launch register.

## Launch record

See [launch status](../../../../blog-launch.md). Browser/mobile visual review and Search Console actions must be reported only when actually performed.
