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
| Production publication | Pending | Use the existing GitHub/Vercel integration; record exact release SHA and live evidence |
| `blog.sppdamaks.com` DNS/project mapping | Blocked on hosting access | Saved Vercel token returned 403 `invalidToken`; no browser was connected |
| Phone-size visual review | Not performed | No browser connected; automated rendering is not a visual check |
| Search Console sitemap submission | Not performed | Authenticated Search Console access needed |
| Google indexing requests | Not performed | Submit only the final canonical URLs after live checks |
| Confirmed Google indexing | Unknown | Check each URL in Search Console after Google processes it |

## Article tracking

| Slug | Owned publication | Index request | Index verdict / date |
| --- | --- | --- | --- |
| meet-sppd-amaks-jeddo-warri | Pending | Not submitted | Unknown |
| buying-electrical-supplies-warri-checklist | Pending | Not submitted | Unknown |
| sppd-amaks-electrical-supplies-to-solar | Pending | Not submitted | Unknown |
| first-solar-setup-warri-quote-checklist | Pending | Not submitted | Unknown |
| home-appliances-warri-delivery | Pending | Not submitted | Unknown |
| sppd-amaks-electrical-supplies-fans-generator-parts | Pending | Not submitted | Unknown |

## Follow-up

Local HTTP verification was inconclusive: the workspace's database connections failed using TCP, HTTP and WebSocket transports. Existing root-layout database calls also failed. No database settings or schema were changed for the blog. The final production HTTP checks remain required. The isolated release deliberately excludes newer unrelated feature-branch commits.

After release, record the verified live URLs here. Once hosting access is restored, map the blog subdomain and switch canonicals together, then use those final URLs for other platforms. Review index results in 7–14 days and about 30 days after submission. Do not mark a URL indexed solely because a sitemap was accepted or an indexing request succeeded.
