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
| `blog.sppdamaks.com` DNS/project mapping | Blocked on hosting access | Saved Vercel token returned 403 `invalidToken`; no browser was connected |
| Phone-size visual review | Not performed | No browser connected; automated rendering is not a visual check |
| Search Console sitemap submission | Not performed | Authenticated Search Console access needed |
| Google indexing requests | Not performed | Submit only the final canonical URLs after live checks |
| Confirmed Google indexing | Unknown | Check each URL in Search Console after Google processes it |

## Article tracking

| Slug | Owned publication | Index request | Index verdict / date |
| --- | --- | --- | --- |
| meet-sppd-amaks-jeddo-warri | Live on www, HTTP 200 | Not submitted | Unknown |
| buying-electrical-supplies-warri-checklist | Live on www, HTTP 200 | Not submitted | Unknown |
| sppd-amaks-electrical-supplies-to-solar | Live on www, HTTP 200 | Not submitted | Unknown |
| first-solar-setup-warri-quote-checklist | Live on www, HTTP 200 | Not submitted | Unknown |
| home-appliances-warri-delivery | Live on www, HTTP 200 | Not submitted | Unknown |
| sppd-amaks-electrical-supplies-fans-generator-parts | Live on www, HTTP 200 | Not submitted | Unknown |

## Follow-up

Local HTTP verification was inconclusive: the workspace's database connections failed using TCP, HTTP and WebSocket transports. Existing root-layout database calls also failed. No database settings or schema were changed for the blog. Production HTTP verification passed: index plus all six posts returned 200 with the expected canonical; each post exposed valid BlogPosting and BreadcrumbList JSON-LD, the sitemap contained all six URLs, an unknown slug returned 404, and app-host responses retained `noindex, nofollow`. The isolated release deliberately excludes newer unrelated feature-branch commits.

After release, record the verified live URLs here. Once hosting access is restored, map the blog subdomain and switch canonicals together, then use those final URLs for other platforms. Review index results in 7–14 days and about 30 days after submission. Do not mark a URL indexed solely because a sitemap was accepted or an indexing request succeeded.

## Verified owned reference URLs

- [Meet SPPD AMAKS: Electrical Supplies and Home Appliances in Jeddo, Warri](https://www.sppdamaks.com/blog/meet-sppd-amaks-jeddo-warri)
- [Buying Electrical Supplies for a House in Warri: A Practical Shopping Checklist](https://www.sppdamaks.com/blog/buying-electrical-supplies-warri-checklist)
- [From Electrical Supplies to Solar: Introducing SPPD AMAKS](https://www.sppdamaks.com/blog/sppd-amaks-electrical-supplies-to-solar)
- [Planning Your First Solar Setup in Warri: What to Prepare Before Asking for a Quote](https://www.sppdamaks.com/blog/first-solar-setup-warri-quote-checklist)
- [Shopping for Home Appliances in Warri Without Leaving Home](https://www.sppdamaks.com/blog/home-appliances-warri-delivery)
- [Electrical Supplies, Fans, and Generator Parts: What You Can Enquire About at SPPD AMAKS](https://www.sppdamaks.com/blog/sppd-amaks-electrical-supplies-fans-generator-parts)

The main-site sitemap is public at https://www.sppdamaks.com/sitemap.xml and contains all six URLs. Search Console submission and Google index verdicts are still unverified. `blog.sppdamaks.com` returned a DNS `ENOTFOUND` during the launch check; existing www, shop and app mappings were not changed.
