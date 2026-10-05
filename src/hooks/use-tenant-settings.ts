import { api } from "~/trpc/react";
import { formatMoney } from "~/lib/domain/checkout";

export function useTenantSettings() {
    const { data: settings, isLoading } = api.settings.getTenantSettings.useQuery(undefined, {
        staleTime: 1000 * 30, // Cache for 30 seconds (reduced from 5 minutes)
        retry: false,
        refetchOnWindowFocus: true,
    });

    return {
        settings,
        currency: settings?.currency ?? "₦",
        location: settings?.location ?? "",
        isLoading,
    };
}

/**
 * Back-office currency (signed-in staff). Reads the admin settings query, so
 * on the public storefront use `useShopCurrency` instead.
 */
export function useCurrency() {
    const { currency } = useTenantSettings();

    return {
        currency,
        formatCurrency: (amount: number | string | undefined | null) =>
            formatMoney(amount, currency),
    };
}

/**
 * Storefront currency. Reads the public `shop.getShopDetails` query, which
 * works for anonymous shoppers (the admin settings query 401s for them).
 */
export function useShopCurrency() {
    const { data } = api.shop.getShopDetails.useQuery(undefined, {
        staleTime: 1000 * 60 * 5,
    });
    const currency = data?.tenant?.currency ?? "₦";

    return {
        currency,
        formatCurrency: (amount: number | string | undefined | null) =>
            formatMoney(amount, currency),
    };
}
