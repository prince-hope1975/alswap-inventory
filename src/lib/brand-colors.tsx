"use client";

import { useEffect } from "react";
import { api } from "~/trpc/react";
import { generateBrandColorCSS } from "./color-utils";

/**
 * Client component that keeps the brand-colour CSS variables in sync after
 * the server-rendered <style> in the root layout.
 *
 * Reads the public `shop.getShopDetails` query (same source the layout uses
 * for SSR) rather than the ADMIN-only `settings.getTenantSettings`, which
 * 401'd — and retried — for every anonymous shopper.
 */
export function BrandColorProvider({ children }: { children: React.ReactNode }) {
    const { data } = api.shop.getShopDetails.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const tenant = data?.tenant;
    const primaryLight = tenant?.primaryColorLight ?? null;
    const primaryDark = tenant?.primaryColorDark ?? null;

    useEffect(() => {
        if (!tenant) return;
        const css = generateBrandColorCSS(primaryLight ?? "#9333EA", primaryDark ?? "#A855F7");

        let styleElement = document.getElementById("brand-colors-styles");
        if (!styleElement) {
            styleElement = document.createElement("style");
            styleElement.id = "brand-colors-styles";
            document.head.appendChild(styleElement);
        }
        if (styleElement.textContent !== css) styleElement.textContent = css;
    }, [tenant, primaryLight, primaryDark]);

    return <>{children}</>;
}
