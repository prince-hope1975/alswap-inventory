import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StorefrontImage } from "./storefront-image";

const cloudinaryImage =
  "https://res.cloudinary.com/diassheoa/image/upload/v1767816036/dfx/product.jpg";

afterEach(cleanup);

describe("StorefrontImage", () => {
  it("retries the original Cloudinary URL when optimization fails", () => {
    render(
      <div style={{ position: "relative", height: 160, width: 160 }}>
        <StorefrontImage
          src={cloudinaryImage}
          alt="Desoldering pump"
          width={160}
          height={160}
        />
      </div>,
    );

    const image = screen.getByRole("img", { name: "Desoldering pump" });
    expect(image).not.toHaveAttribute("src", cloudinaryImage);

    fireEvent.error(image);

    expect(
      screen.getByRole("img", { name: "Desoldering pump" }),
    ).toHaveAttribute("src", cloudinaryImage);
  });

  it("shows a stable placeholder when the optimized and original images fail", () => {
    render(
      <div style={{ position: "relative", height: 160, width: 160 }}>
        <StorefrontImage
          src={cloudinaryImage}
          alt="Desoldering pump"
          fill
          sizes="10rem"
        />
      </div>,
    );

    fireEvent.error(screen.getByRole("img", { name: "Desoldering pump" }));
    fireEvent.error(screen.getByRole("img", { name: "Desoldering pump" }));

    expect(
      screen.getByRole("img", { name: "Desoldering pump unavailable" }),
    ).toHaveTextContent("Image unavailable");
  });

  it("clears the loading state when the image finishes", async () => {
    render(
      <div style={{ position: "relative", height: 160, width: 160 }}>
        <StorefrontImage
          src={cloudinaryImage}
          alt="Desoldering pump"
          width={160}
          height={160}
        />
      </div>,
    );

    const image = screen.getByRole("img", { name: "Desoldering pump" });
    expect(image.parentElement).toHaveAttribute("aria-busy", "true");

    fireEvent.load(image);

    await waitFor(() => {
      expect(image.parentElement).toHaveAttribute("aria-busy", "false");
    });
  });
});
