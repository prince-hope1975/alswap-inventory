export type StoreConfig = {
    template: "modern" | "classic" | "marketplace"|"minimal"|"boutique";
    themeMode: "system" | "light" | "dark";
    showHero: boolean;
    showArticles: boolean;
    primaryColor?: string;
    heroTitle?: string;
    heroDescription?: string;
};
