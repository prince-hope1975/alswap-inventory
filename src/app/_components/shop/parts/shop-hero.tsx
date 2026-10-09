"use client";

import { Headset, MapPin, Wallet } from "lucide-react";

interface ShopHeroProps {
    tenantName?: string;
    /** Store's own headline (Store settings > hero title); replaces the default H1. */
    heroTitle?: string;
    description?: string;
    /** Kept for older templates; the compact band has no CTA, products sit right below. */
    onShopNow?: () => void;
    className?: string;
}

/**
 * Compact intro band. Top padding clears the fixed navbar (taller on mobile,
 * where it carries a search row) so the first product row stays above the fold.
 */
export function ShopHero({ tenantName, heroTitle, description, className = "" }: ShopHeroProps) {
    const trimmedTitle = heroTitle?.trim();
    const customTitle = trimmedTitle && trimmedTitle.length > 0 ? trimmedTitle : null;
    return (
        <div className={`relative overflow-hidden bg-[#112b3c] pt-[124px] pb-4 text-white sm:pb-6 md:pt-28 md:pb-8 ${className}`}>
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full border-[36px] border-[#f5a623]/15" aria-hidden />

            <div className="relative container mx-auto flex flex-col gap-4 px-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                    {tenantName && (
                        <p className="mb-1.5 hidden text-[11px] font-bold tracking-[0.16em] text-[#8dc5dc] uppercase sm:block">
                            {tenantName}
                        </p>
                    )}
                    {/* One line on phones so the first product row stays above the fold. */}
                    <h1 className="truncate text-lg font-black tracking-[-0.02em] sm:whitespace-normal sm:text-3xl sm:tracking-[-0.03em] lg:text-4xl">
                        {customTitle ?? (
                            <>
                                Electrical products for <span className="text-[#f5a623]">real work</span>
                            </>
                        )}
                    </h1>
                    <p className="mt-2 hidden text-sm leading-relaxed text-white/70 sm:block sm:text-base">
                        {description?.trim() ? description : "Cables, lighting, tools, power equipment and accessories, with local store support."}
                    </p>
                </div>
                <ul className="hidden shrink-0 gap-5 text-sm font-medium text-white/80 lg:flex">
                    <li className="flex items-center gap-2">
                        <Headset className="h-4 w-4 text-[#f5a623]" aria-hidden />
                        Local store support
                    </li>
                    <li className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#f5a623]" aria-hidden />
                        Store pickup
                    </li>
                    <li className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#f5a623]" aria-hidden />
                        Pay online or on pickup
                    </li>
                </ul>
            </div>
        </div>
    );
}
