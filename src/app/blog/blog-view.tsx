import Link from "next/link";
import type { ReactNode } from "react";
import type { BlogPost } from "~/lib/content/blog";
import { parseArticleBlocks } from "~/lib/content/article-blocks";

export type BlogLinks = {
  home: string;
  shop: string;
  contact: string;
  blog: string;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function Shell({ links, children }: { links: BlogLinks; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f3ed] text-[#14212b] selection:bg-[#f5a623]/40">
      <a
        href="#main-content"
        className="sr-only z-50 bg-white p-4 focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <header className="border-b border-[#14212b]/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link
            href={links.blog}
            className="text-lg leading-tight font-black tracking-tight"
          >
            SPPD AMAKS{" "}
            <span className="block text-[10px] tracking-[0.24em] text-[#07597d] uppercase">
              The store journal
            </span>
          </Link>
          <nav
            aria-label="Blog navigation"
            className="flex flex-wrap gap-1 text-sm font-bold"
          >
            <Link
              href={links.home}
              className="inline-flex min-h-11 items-center px-3 hover:underline"
            >
              Home
            </Link>
            <Link
              href={links.shop}
              className="inline-flex min-h-11 items-center px-3 hover:underline"
            >
              Shop
            </Link>
            <a
              href="tel:+2348033367124"
              className="inline-flex min-h-11 items-center border border-[#14212b] px-3 hover:bg-[#14212b] hover:text-white"
            >
              Call the store
            </a>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-[#14212b]/20 px-5 py-8 text-sm sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-5 leading-7">
          <p>
            SPPD AMAKS · Established 2018
            <br />
            Jeddo, Delta State, Nigeria
          </p>
          <div className="flex flex-wrap gap-5">
            <Link href={links.contact} className="underline underline-offset-4">
              Visit or enquire
            </Link>
            <Link href={links.blog} className="underline underline-offset-4">
              All articles
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <article className="group border-t border-[#14212b]/25 py-7">
      <div className="flex items-center justify-between gap-3 text-xs font-bold tracking-wider uppercase">
        <span className="text-[#07597d]">{post.category}</span>
        <span className="text-[#5c6870]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <h2 className="mt-4 font-serif text-2xl leading-tight tracking-tight sm:text-3xl">
        <Link
          href={`/blog/${post.slug}`}
          className="decoration-[#f5a623] decoration-2 underline-offset-4 group-hover:underline"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-4 leading-7 text-[#41515c]">{post.description}</p>
      <p className="mt-5 text-sm text-[#5c6870]">
        {post.minutes} min read <span aria-hidden="true">·</span>{" "}
        <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
      </p>
      <Link
        href={`/blog/${post.slug}`}
        className="mt-3 inline-flex min-h-11 items-center font-bold text-[#07597d] hover:underline"
        aria-label={`Read ${post.title}`}
      >
        Read article{" "}
        <span aria-hidden="true" className="ml-2">
          ↗
        </span>
      </Link>
    </article>
  );
}

export function BlogIndex({
  posts,
  links,
}: {
  posts: BlogPost[];
  links: BlogLinks;
}) {
  return (
    <Shell links={links}>
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20"
      >
        <section className="grid gap-8 border-b-4 border-[#14212b] pb-12 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="mb-6 text-xs font-black tracking-[0.2em] text-[#07597d] uppercase">
              From the shop floor / Jeddo & Warri
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-[-0.04em] sm:text-7xl">
              Practical advice.
              <br />
              <span className="italic">Better-informed buys.</span>
            </h1>
          </div>
          <div className="border-l-4 border-[#f5a623] pl-5">
            <p className="text-lg leading-8 text-[#41515c]">
              Get to know SPPD AMAKS. Prepare your electrical shopping list,
              choose home appliances, and organise your first solar enquiry.
            </p>
            <p className="mt-4 text-sm font-bold">
              The business story. The questions worth asking.
            </p>
          </div>
        </section>
        <div className="mt-10 flex justify-between text-xs font-bold tracking-widest uppercase">
          <p>Latest articles</p>
          <p>{posts.length} reads</p>
        </div>
        <section
          aria-label="Articles"
          className="mt-5 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post, index) => (
            <PostCard key={post.slug} post={post} index={index} />
          ))}
        </section>
      </main>
    </Shell>
  );
}

// Only the small Markdown subset used by the editorial collection is supported.
// React escapes text; arbitrary HTML and executable link schemes are not rendered.
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .map((part, index) => {
      if (part.startsWith("**"))
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (!link) return part;
      const href = link[2]!;
      return /^https?:\/\//.test(href) || /^\/(?!\/)/.test(href) ? (
        <a
          key={index}
          href={href}
          className="font-bold text-[#07597d] underline decoration-[#f5a623] decoration-2 underline-offset-4"
        >
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    });
}

export function BlogArticle({
  post,
  related,
  links,
}: {
  post: BlogPost;
  related: BlogPost[];
  links: BlogLinks;
}) {
  return (
    <Shell links={links}>
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16"
      >
        <Link
          href={links.blog}
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#07597d] hover:underline"
        >
          ← All articles
        </Link>
        <article className="mx-auto mt-8 max-w-3xl">
          <header className="border-b border-[#14212b]/25 pb-8">
            <p className="text-xs font-bold tracking-[0.2em] text-[#07597d] uppercase">
              {post.category}
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-[1.1] tracking-[-0.03em] sm:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 text-lg leading-8 text-[#41515c]">
              {post.description}
            </p>
            <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#5c6870]">
              <span>By {post.author}</span>
              <time dateTime={post.publishedAt}>
                Published {dateLabel(post.publishedAt)}
              </time>
              <span>{post.minutes} min read</span>
            </p>
          </header>
          <div className="mt-10 space-y-6 text-lg leading-8 text-[#41515c] [&_a]:break-words">
            {parseArticleBlocks(post.content).map((block, index) => {
              if (block.type === "heading")
                return block.level === 2 ? (
                  <h2
                    key={index}
                    className="pt-6 font-serif text-3xl leading-tight text-[#14212b]"
                  >
                    {inline(block.text)}
                  </h2>
                ) : (
                  <h3
                    key={index}
                    className="pt-4 text-xl font-bold text-[#14212b]"
                  >
                    {inline(block.text)}
                  </h3>
                );
              if (block.type === "paragraph")
                return <p key={index}>{inline(block.text)}</p>;
              if (block.type === "list") {
                const List = block.ordered ? "ol" : "ul";
                return (
                  <List
                    key={index}
                    className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-3 pl-6 marker:text-[#07597d]`}
                  >
                    {block.items.map((item, i) => (
                      <li key={i}>{inline(item)}</li>
                    ))}
                  </List>
                );
              }
              if (block.type === "table")
                return (
                  <div
                    key={index}
                    className="overflow-x-auto border border-[#14212b]/20"
                  >
                    <table className="w-full min-w-[480px] text-left text-sm leading-6">
                      <thead className="bg-[#112b3c] text-white">
                        <tr>
                          {block.headers.map((cell, i) => (
                            <th key={i} scope="col" className="p-3">
                              {inline(cell)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, i) => (
                          <tr key={i} className="border-t border-[#14212b]/20">
                            {row.map((cell, j) => (
                              <td key={j} className="p-3 align-top">
                                {inline(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              return null;
            })}
          </div>
          <aside className="mt-12 border-l-4 border-[#f5a623] bg-white p-6">
            <h2 className="font-serif text-2xl">
              Ready to ask about a product?
            </h2>
            <p className="mt-3 leading-7 text-[#41515c]">
              Confirm availability, specifications, current pricing and delivery
              before ordering.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="tel:+2348033367124"
                className="inline-flex min-h-11 items-center bg-[#112b3c] px-5 font-bold text-white"
              >
                Call 08033367124
              </a>
              <Link
                href={links.shop}
                className="inline-flex min-h-11 items-center border border-[#14212b] px-5 font-bold"
              >
                Browse the shop
              </Link>
            </div>
          </aside>
        </article>
        <section
          aria-label="Related reading"
          className="mt-16 border-t-4 border-[#14212b] pt-8"
        >
          <h2 className="font-serif text-3xl">Related reading</h2>
          <div className="mt-6 grid gap-x-10 md:grid-cols-3">
            {related.map((item, index) => (
              <PostCard key={item.slug} post={item} index={index} />
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
