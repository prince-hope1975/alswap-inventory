# Blog launch and indexing register

Requested 5 October 2026: publish all six prepared articles on an owned blog, following the existing subdomain surfaces.

| Stage | State | Evidence / next action |
| --- | --- | --- |
| Six article source records | Implemented | `src/content/blog/posts.json`; prior owner-supplied brand facts retained |
| Blog pages and navigation | Implemented | `/blog`, `/blog/[slug]`; call/shop links and related reading |
| Subdomain application routing | Implemented | `blog.` root maps to `/blog`; tenant root stripping and auth checks tested |
| Canonicals, structured data, sitemap | Implemented | Canonicals use www until `BLOG_SUBDOMAIN=blog` is activated |
| Tests | Passed | Initial workspace checks passed; isolated main-based release passed 84 focused content, SEO, tenant and rendering tests |
| Production build | Passed | Workspace and isolated main-based `pnpm build` both compiled the blog routes successfully |
| Production publication | Live, verified 5 October 2026 | Release `bee0f5d2fd7a9a6670f7a94a04a7d0236b8846a2`; GitHub Production deployment `6852771600` succeeded; all six public URLs returned HTTP 200 |
| `blog.sppdamaks.com` DNS/project mapping | Added to Vercel; DNS pending | Attached to the existing project in Production on 5 October. Vercel reports Invalid Configuration because the Cloudflare CNAME is missing. Cloudflare is waiting for owner sign-in. |
| Phone-size visual review | Passed, sampled | Chrome at 390 × 844: blog index and electrical checklist article visually checked; page width 375px including scrollbar, table scrolls inside a 333px container rather than expanding the page |
| Search Console sitemap submission | Accepted 5 October 2026 | The updated www sitemap was submitted in the Domain property sppdamaks.com. Google displayed Sitemap submitted successfully. |
| Google indexing requests | Five articles + blog index accepted | Google displayed Indexing requested for each accepted URL. The electrical checklist first returned a submission error; its one later retry hit the daily quota. Retry that URL on 6 October. |
| Confirmed Google indexing | Not confirmed | All six article inspections reported URL unknown to Google before requests. Queue acceptance is not inclusion. Recheck after processing. |

## Article tracking

| Slug | Owned publication | Index request | Index verdict / date |
| --- | --- | --- | --- |
| meet-sppd-amaks-jeddo-warri | Live on www, HTTP 200 | Accepted 5 October | Before request: URL unknown to Google, 5 October |
| buying-electrical-supplies-warri-checklist | Live on www, HTTP 200 | Blocked: daily quota; retry 6 October | Before request: URL unknown to Google, 5 October |
| sppd-amaks-electrical-supplies-to-solar | Live on www, HTTP 200 | Accepted 5 October | Before request: URL unknown to Google, 5 October |
| first-solar-setup-warri-quote-checklist | Live on www, HTTP 200 | Accepted 5 October | Before request: URL unknown to Google, 5 October |
| home-appliances-warri-delivery | Live on www, HTTP 200 | Accepted 5 October | Before request: URL unknown to Google, 5 October |
| sppd-amaks-electrical-supplies-fans-generator-parts | Live on www, HTTP 200 | Accepted 5 October | Before request: URL unknown to Google, 5 October |

## Follow-up

Local HTTP verification was inconclusive: the workspace's database connections failed using TCP, HTTP and WebSocket transports. Existing root-layout database calls also failed. No database settings or schema were changed for the blog. Production HTTP verification passed: index plus all six posts returned 200 with the expected canonical; each post exposed valid BlogPosting and BreadcrumbList JSON-LD, the sitemap contained all six URLs, an unknown slug returned 404, and app-host responses retained `noindex, nofollow`. The isolated release deliberately excludes newer unrelated feature-branch commits.

Complete the Cloudflare DNS record below after owner sign-in. Verify DNS and HTTPS, then set BLOG_SUBDOMAIN=blog in Vercel Production and redeploy to switch article canonicals and sitemaps together. Until that happens, the working www URLs remain authoritative. Submit the blog-host sitemap after the switch. Review index results in 7–14 days and about 30 days after submission. Do not mark a URL indexed solely because a sitemap was accepted or an indexing request succeeded.

## Verified owned reference URLs

- [Meet SPPD AMAKS: Electrical Supplies and Home Appliances in Jeddo, Warri](https://www.sppdamaks.com/blog/meet-sppd-amaks-jeddo-warri)
- [Buying Electrical Supplies for a House in Warri: A Practical Shopping Checklist](https://www.sppdamaks.com/blog/buying-electrical-supplies-warri-checklist)
- [From Electrical Supplies to Solar: Introducing SPPD AMAKS](https://www.sppdamaks.com/blog/sppd-amaks-electrical-supplies-to-solar)
- [Planning Your First Solar Setup in Warri: What to Prepare Before Asking for a Quote](https://www.sppdamaks.com/blog/first-solar-setup-warri-quote-checklist)
- [Shopping for Home Appliances in Warri Without Leaving Home](https://www.sppdamaks.com/blog/home-appliances-warri-delivery)
- [Electrical Supplies, Fans, and Generator Parts: What You Can Enquire About at SPPD AMAKS](https://www.sppdamaks.com/blog/sppd-amaks-electrical-supplies-fans-generator-parts)

The main-site sitemap is public at https://www.sppdamaks.com/sitemap.xml and contains all six URLs. The main sitemap has now been accepted in Search Console. Index inclusion remains unconfirmed. `blog.sppdamaks.com` returned a DNS `ENOTFOUND` during the launch check; existing www, shop and app mappings were not changed.

## DNS handoff — 5 October 2026

Vercel requires this exact Cloudflare record:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | blog | 68645c813783dc3a.vercel-dns-017.com | Disabled / DNS only |

The Cloudflare sign-in tab is open for the owner. No DNS records, existing domains, session settings or BLOG_SUBDOMAIN environment variable were changed in this console session. Only the blog domain attachment and Google submissions were applied.

## Next checks

- **6 October:** retry only the electrical checklist indexing request after Google’s daily quota resets. Do not repeat the already accepted requests.
- **12–19 October:** inspect the six www article URLs and blog index for confirmed indexing and Google-selected canonicals.
- **Around 4 November:** review indexing, impressions, clicks and enquiries; investigate any explicit exclusions.
- If the host changes first, inspect the new final canonical URLs and preserve the distinction between submission and confirmed inclusion.
