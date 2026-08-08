import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArticleContent } from "./article-content";

describe("ArticleContent", () => {
  it("renders semantic headings and safe external links", () => {
    render(
      <ArticleContent
        content={
          "## Check the specification\n\nRead the [manufacturer guide](https://example.com/guide)."
        }
      />,
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Check the specification",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "manufacturer guide" }),
    ).toHaveAttribute("rel", "noreferrer");
  });
});
