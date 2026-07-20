"use client";

interface ShopHeroProps {
    tenantName?: string;
    description?: string;
    onShopNow: () => void;
    className?: string;
}

export function ShopHero({ tenantName, description, onShopNow, className = "" }: ShopHeroProps) {
    return (
        <div className={`relative overflow-hidden bg-[#112b3c] pb-16 pt-32 text-white md:pb-20 md:pt-40 ${className}`}>
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
                <div className="absolute -right-20 top-10 h-72 w-72 rounded-full border-[48px] border-[#f5a623]/15" />
            </div>

            <div className="container relative z-10 mx-auto px-4 text-center">
                <span className="inline-block mb-5 border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8dc5dc]">
                    {tenantName || "New Collection Available"}
                </span>
                <h1 className="mb-6 text-4xl font-black tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                    Electrical products for <span className="text-[#f5a623]">real work</span>
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-base text-white/65 leading-relaxed sm:text-lg">
                    {description || "Browse dependable cables, lighting, tools, power equipment and accessories with local store support."}
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onShopNow}
                        className="group relative bg-[#f5a623] px-10 py-4 font-semibold text-[#14212b] transition-all hover:bg-[#ffc04d] hover:scale-105"
                    >
                        <span className="relative z-10">Shop Now</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
