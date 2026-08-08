import type { ReactNode } from "react";

import { StorefrontImage } from "~/app/_components/shop/storefront-image";
import { parseArticleBlocks } from "~/lib/content/article-blocks";

function inlineContent(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const label = match[1] ?? "Link";
    const href = match[2] ?? "";
    const safe = href.startsWith("/") || /^https?:\/\//.test(href);
    nodes.push(
      safe ? (
        <a
          key={`${href}-${index}`}
          href={href}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          className="font-bold text-[#07597d] underline decoration-[#f5a623] decoration-2 underline-offset-4"
        >
          {label}
        </a>
      ) : (
        label
      ),
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function ArticleContent({ content }: { content: string }) {
  const blocks = parseArticleBlocks(content);
  return (
    <div className="space-y-7 text-lg leading-8 text-[#41515c]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return block.level === 2 ? (
            <h2
              key={index}
              className="pt-6 text-3xl leading-tight font-black tracking-[-0.04em] text-[#14212b] sm:text-4xl"
            >
              {inlineContent(block.text)}
            </h2>
          ) : (
            <h3 key={index} className="pt-3 text-2xl font-black text-[#14212b]">
              {inlineContent(block.text)}
            </h3>
          );
        }
        if (block.type === "paragraph")
          return <p key={index}>{inlineContent(block.text)}</p>;
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={index}
              className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-3 border-l-4 border-[#f5a623] bg-white py-5 pr-6 pl-10 marker:font-black marker:text-[#07597d]`}
            >
              {block.items.map((item) => (
                <li key={item}>{inlineContent(item)}</li>
              ))}
            </List>
          );
        }
        if (block.type === "image")
          return (
            <figure
              key={index}
              className="relative aspect-video overflow-hidden border border-[#14212b]/20 bg-white"
            >
              <StorefrontImage
                src={block.src}
                alt={block.alt}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </figure>
          );
        return (
          <div
            key={index}
            className="overflow-x-auto border border-[#14212b]/20 bg-white"
          >
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="bg-[#112b3c] text-white">
                <tr>
                  {block.headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 font-black"
                    >
                      {inlineContent(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-[#14212b]/15">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        {inlineContent(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
