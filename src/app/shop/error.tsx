"use client";

import { StorefrontError } from "~/app/_components/shop/storefront-error";

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StorefrontError
      error={error}
      reset={reset}
      title="The shop didn't load"
      componentName="ShopError"
    />
  );
}
