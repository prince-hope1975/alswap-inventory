"use client";

import { StorefrontError } from "~/app/_components/shop/storefront-error";

export default function ProductError({
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
      title="This product didn't load"
      componentName="ProductError"
    />
  );
}
