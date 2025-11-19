import { api } from "~/trpc/react";

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

export function useCurrency() {
    const { currency } = useTenantSettings();

    const formatCurrency = (amount: number | string | undefined | null) => {
        if (amount === undefined || amount === null) return `${currency}0.00`;
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        if (isNaN(num)) return `${currency}0.00`;
        
        return `${currency}${num.toFixed(2)}`;
    };

    return {
        currency,
        formatCurrency,
    };
}

