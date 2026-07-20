export type StoreConfig = {
    template: "modern" | "classic" | "marketplace" | "minimal" | "boutique" | "conversion" | "beauty";
    themeMode: "system" | "light" | "dark";
    showHero: boolean;
    showArticles: boolean;
    primaryColor?: string;
    heroTitle?: string;
    heroDescription?: string;
    // Optional checkout settings
    deliveryFee?: number;
    deliveryPricing?: {
        type: "flat" | "distance";
        // Used when type === "distance"
        baseFee?: number;
        perKmFee?: number;
        maxKm?: number;
    };
};
