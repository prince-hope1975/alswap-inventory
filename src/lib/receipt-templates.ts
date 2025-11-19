export type ReceiptTemplate = {
    id: string;
    name: string;
    description: string;
    // CSS classes or render hints
    styles: {
        container: string;
        header: string;
        logo: string;
        storeName: string;
        meta: string;
        divider: string;
        table: string;
        itemRow: string;
        itemPrice: string;
        totals: string;
        footer: string;
    };
    renderType: "standard" | "thermal" | "card" | "minimal" | "grid";
};

export const RECEIPT_TEMPLATES: Record<string, ReceiptTemplate> = {
    classic: {
        id: "classic",
        name: "Classic",
        description: "Traditional simple list view",
        renderType: "standard",
        styles: {
            container: "font-mono text-sm text-gray-700 dark:text-gray-300 p-6 bg-white dark:bg-gray-900",
            header: "mb-4 text-center",
            logo: "mx-auto mb-2 h-12 object-contain",
            storeName: "text-lg font-bold",
            meta: "text-xs mt-1",
            divider: "mb-4 border-b border-dashed border-gray-300 pb-2 dark:border-gray-600",
            table: "w-full",
            itemRow: "flex justify-between py-1",
            itemPrice: "text-right",
            totals: "space-y-1 text-right pt-4",
            footer: "mt-6 text-center text-xs",
        },
    },
    modern: {
        id: "modern",
        name: "Modern",
        description: "Clean card style with logo",
        renderType: "card",
        styles: {
            container: "font-sans text-sm text-gray-800 bg-white p-6 rounded-lg shadow-sm",
            header: "mb-6 text-center",
            logo: "mx-auto mb-3 h-16 object-contain",
            storeName: "text-xl font-bold uppercase tracking-wide",
            meta: "text-xs text-gray-500",
            divider: "border-b border-gray-100 pb-2",
            table: "w-full space-y-3 mb-6",
            itemRow: "flex justify-between border-b border-gray-100 pb-2 last:border-0",
            itemPrice: "font-medium",
            totals: "space-y-2 border-t border-gray-200 pt-4",
            footer: "mt-8 text-center text-sm font-medium italic text-gray-600",
        },
    },
    thermal: {
        id: "thermal",
        name: "Thermal",
        description: "Optimized for 58/80mm printers",
        renderType: "thermal",
        styles: {
            container: "font-mono text-[10px] text-black bg-white p-4",
            header: "text-center",
            logo: "mx-auto mb-2 h-12 object-contain grayscale",
            storeName: "text-xl font-bold",
            meta: "text-[10px]",
            divider: "my-2 border-b border-dashed border-black",
            table: "w-full text-left",
            itemRow: "",
            itemPrice: "text-right align-top",
            totals: "text-right font-bold",
            footer: "mt-4 text-center text-[10px]",
        },
    },
    minimalist: {
        id: "minimalist",
        name: "Minimalist",
        description: "Clean, lots of whitespace",
        renderType: "minimal",
        styles: {
            container: "font-sans text-xs text-gray-600 bg-white p-8",
            header: "mb-8",
            logo: "h-8 object-contain mb-4",
            storeName: "text-2xl font-light tracking-tighter text-black",
            meta: "text-[10px] uppercase tracking-widest mt-4",
            divider: "hidden", // No dividers
            table: "w-full mb-8",
            itemRow: "flex justify-between py-2 border-b border-gray-100",
            itemPrice: "font-light",
            totals: "text-right text-sm font-normal space-y-2",
            footer: "mt-12 text-[10px] text-gray-400",
        },
    },
    corporate: {
        id: "corporate",
        name: "Corporate",
        description: "Professional dark header",
        renderType: "standard",
        styles: {
            container: "font-sans text-sm text-gray-800 bg-white overflow-hidden",
            header: "bg-gray-900 text-white p-6 text-center mb-6",
            logo: "mx-auto mb-2 h-10 object-contain brightness-0 invert",
            storeName: "text-lg font-bold",
            meta: "text-xs text-gray-400 mt-1",
            divider: "border-b-2 border-gray-900 mb-4 mx-6",
            table: "w-full px-6",
            itemRow: "flex justify-between py-2",
            itemPrice: "font-bold",
            totals: "px-6 pt-4 text-right border-t border-gray-200 mx-6 mt-4",
            footer: "mt-6 bg-gray-50 p-4 text-center text-xs text-gray-500",
        },
    },
    boutique: {
        id: "boutique",
        name: "Boutique",
        description: "Elegant serif fonts",
        renderType: "standard",
        styles: {
            container: "font-serif text-sm text-gray-800 bg-[#fffdf5] p-6 border border-[#e6e0d0]",
            header: "mb-8 text-center border-b border-double border-[#d4c5a5] pb-6",
            logo: "mx-auto mb-4 h-14 object-contain sepia",
            storeName: "text-2xl italic font-medium text-[#5c4b2c]",
            meta: "text-xs text-[#8c7b5c] mt-2",
            divider: "border-b border-[#e6e0d0] my-2",
            table: "w-full",
            itemRow: "flex justify-between py-2 text-[#5c4b2c]",
            itemPrice: "",
            totals: "text-right pt-4 text-[#5c4b2c] font-medium",
            footer: "mt-8 text-center text-xs italic text-[#8c7b5c]",
        },
    },
    tech: {
        id: "tech",
        name: "Tech",
        description: "Monospace matrix style",
        renderType: "standard",
        styles: {
            container: "font-mono text-xs text-[#00ff00] bg-black p-6",
            header: "mb-4 text-center border-b border-[#00ff00] pb-4",
            logo: "mx-auto mb-2 h-10 object-contain grayscale invert brightness-200 sepia saturate-[500%] hue-rotate-[80deg]", // Attempt to make green
            storeName: "text-lg uppercase tracking-widest",
            meta: "text-[10px] opacity-80",
            divider: "border-b border-dashed border-[#003300] my-2",
            table: "w-full",
            itemRow: "flex justify-between py-1",
            itemPrice: "",
            totals: "text-right pt-4 border-t border-[#00ff00] mt-4",
            footer: "mt-6 text-center text-[10px] opacity-60",
        },
    },
    eco: {
        id: "eco",
        name: "Eco",
        description: "Green accents, nature inspired",
        renderType: "card",
        styles: {
            container: "font-sans text-sm text-green-900 bg-green-50/30 p-6 rounded-xl border border-green-100",
            header: "mb-6 text-center",
            logo: "mx-auto mb-3 h-12 object-contain",
            storeName: "text-xl font-bold text-green-800",
            meta: "text-xs text-green-600",
            divider: "border-b border-green-200 pb-2 mb-2",
            table: "w-full space-y-2",
            itemRow: "flex justify-between py-2 bg-white/50 px-2 rounded",
            itemPrice: "font-semibold text-green-700",
            totals: "pt-4 text-right space-y-1",
            footer: "mt-6 text-center text-xs text-green-600",
        },
    },
    compact_list: {
        id: "compact_list",
        name: "Compact List",
        description: "Side-by-side efficient layout",
        renderType: "grid",
        styles: {
            container: "font-sans text-xs text-gray-900 bg-white p-4",
            header: "mb-2 flex justify-between items-end border-b-2 border-black pb-2",
            logo: "h-8 object-contain",
            storeName: "font-bold uppercase",
            meta: "text-right text-[10px]",
            divider: "border-t border-gray-200",
            table: "w-full grid grid-cols-1 gap-1 my-2",
            itemRow: "grid grid-cols-[1fr_auto_auto] gap-4 items-center",
            itemPrice: "font-bold",
            totals: "text-right border-t-2 border-black pt-2 font-bold",
            footer: "mt-2 text-center text-[10px] border-t border-gray-200 pt-2",
        },
    },
    big_type: {
        id: "big_type",
        name: "Big Type",
        description: "High visibility large fonts",
        renderType: "standard",
        styles: {
            container: "font-sans text-base text-black bg-white p-6",
            header: "mb-6 text-center",
            logo: "mx-auto mb-4 h-16 object-contain",
            storeName: "text-3xl font-black",
            meta: "text-sm font-medium mt-2",
            divider: "border-b-4 border-black my-4",
            table: "w-full",
            itemRow: "flex justify-between py-3 text-lg border-b border-gray-300",
            itemPrice: "font-bold",
            totals: "text-right pt-6 text-xl font-bold",
            footer: "mt-8 text-center text-sm font-bold",
        },
    },
    detailed: {
        id: "detailed",
        name: "Detailed",
        description: "Includes SKU and barcodes",
        renderType: "standard",
        styles: {
            container: "font-sans text-xs text-gray-700 bg-white p-6 border border-gray-300",
            header: "mb-4 flex flex-col items-start border-b border-gray-300 pb-4",
            logo: "h-10 object-contain mb-2",
            storeName: "text-lg font-bold",
            meta: "text-xs space-y-0.5",
            divider: "border-b border-gray-200 my-2",
            table: "w-full",
            itemRow: "grid grid-cols-[1fr_auto] gap-2 py-2 border-b border-gray-100",
            itemPrice: "text-right font-medium",
            totals: "text-right pt-4 space-y-1 bg-gray-50 p-2 mt-4 rounded",
            footer: "mt-4 text-left text-[10px] text-gray-500",
        },
    },
    retro: {
        id: "retro",
        name: "Retro",
        description: "Typewriter dotted style",
        renderType: "standard",
        styles: {
            container: "font-mono text-sm text-[#333] bg-[#f0f0f0] p-6 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]",
            header: "mb-6 text-center border-b-2 border-dotted border-[#333] pb-4",
            logo: "mx-auto mb-4 h-12 object-contain grayscale contrast-150",
            storeName: "text-xl tracking-widest uppercase",
            meta: "text-xs mt-2",
            divider: "border-b border-dotted border-[#333] my-2",
            table: "w-full",
            itemRow: "flex justify-between py-1",
            itemPrice: "",
            totals: "text-right pt-4 border-t-2 border-dotted border-[#333] mt-4",
            footer: "mt-6 text-center text-xs uppercase tracking-widest",
        },
    },
};

export const TEMPLATE_LIST = Object.values(RECEIPT_TEMPLATES);
