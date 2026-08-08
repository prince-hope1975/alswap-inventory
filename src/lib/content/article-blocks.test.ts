import { describe, expect, it } from "vitest";

import { parseArticleBlocks } from "./article-blocks";

describe("parseArticleBlocks", () => {
  it("turns markdown-like copy into semantic headings, paragraphs and lists", () => {
    expect(
      parseArticleBlocks(
        "## Choose the right cable\n\nAsk about the load.\n\n- Check the rating\n- Confirm the length",
      ),
    ).toEqual([
      { type: "heading", level: 2, text: "Choose the right cable" },
      { type: "paragraph", text: "Ask about the load." },
      {
        type: "list",
        ordered: false,
        items: ["Check the rating", "Confirm the length"],
      },
    ]);
  });

  it("does not interpret embedded HTML as executable markup", () => {
    expect(parseArticleBlocks('<script>alert("x")</script>')).toEqual([
      { type: "paragraph", text: '<script>alert("x")</script>' },
    ]);
  });

  it("recognizes images and simple tables as structured content", () => {
    expect(
      parseArticleBlocks(
        "![Cable ratings chart](https://cdn.example.com/chart.png)\n\n| Type | Use |\n| --- | --- |\n| Flex | Appliances |",
      ),
    ).toEqual([
      {
        type: "image",
        alt: "Cable ratings chart",
        src: "https://cdn.example.com/chart.png",
      },
      {
        type: "table",
        headers: ["Type", "Use"],
        rows: [["Flex", "Appliances"]],
      },
    ]);
  });
});
