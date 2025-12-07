export type StoreConfig = {
    template: "modern" | "classic" | "marketplace";
    themeMode: "system" | "light" | "dark";
    showHero: boolean;
    showArticles: boolean;
    primaryColor?: string;
    heroTitle?: string;
    heroDescription?: string;
};
