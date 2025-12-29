export type StoreConfig = {
    template: "modern" | "classic" | "marketplace" | "minimal" | "boutique" | "conversion";
    themeMode: "system" | "light" | "dark";
    showHero: boolean;
    showArticles: boolean;
    primaryColor?: string;
    heroTitle?: string;
    heroDescription?: string;
    // Optional checkout settings
    deliveryFee?: number;
};
