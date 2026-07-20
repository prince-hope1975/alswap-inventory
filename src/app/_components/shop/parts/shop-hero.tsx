"use client";

interface ShopHeroProps {
    tenantName?: string;
    description?: string;
    onShopNow: () => void;
    className?: string;
}

export function ShopHero({ tenantName, description, onShopNow, className = "" }: ShopHeroProps) {
    return (
        <div className={`relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden ${className}`}>
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-[var(--brand-primary-600)]/20 blur-[150px] rounded-full opacity-60 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[700px] h-[500px] bg-blue-600/15 blur-[130px] rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container relative z-10 mx-auto px-4 text-center">
                <span className="inline-block mb-6 rounded-full border border-[var(--brand-primary-500)]/30 bg-[var(--brand-primary-500)]/10 px-5 py-2 text-sm font-medium text-[var(--brand-primary-300)] backdrop-blur-sm">
                    {tenantName || "New Collection Available"}
                </span>
                <h1 className="mb-8 text-5xl font-extrabold tracking-tight text-white sm:text-7xl lg:text-8xl">
                    Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary-400)] via-purple-400 to-blue-400">Premium</span> Quality
                </h1>
                <p className="mx-auto mb-12 max-w-2xl text-lg text-gray-400 leading-relaxed">
                    {description || "Explore our curated selection of top-tier products designed to elevate your lifestyle. Shop with confidence and enjoy seamless delivery."}
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onShopNow}
                        className="group relative rounded-full bg-gradient-to-r from-[var(--brand-primary-600)] to-[var(--brand-primary-500)] px-10 py-4 font-semibold text-white transition-all hover:shadow-2xl hover:shadow-[var(--brand-primary-500)]/50 hover:scale-105"
                    >
                        <span className="relative z-10">Shop Now</span>
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--brand-primary-500)] to-[var(--brand-primary-400)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>
        </div>
    );
}
