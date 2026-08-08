import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlableCategoryLinks } from "./crawlable-category-links";

describe("CrawlableCategoryLinks", () => {
  it("publishes real anchors for categories with canonical slugs", () => {
    render(
      <CrawlableCategoryLinks
        categories={[
          { id: 1, name: "Cables", slug: "cables-1" },
          { id: 2, name: "Legacy", slug: null },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Cables" })).toHaveAttribute(
      "href",
      "/categories/cables-1",
    );
    expect(screen.queryByText("Legacy")).not.toBeInTheDocument();
  });
});
