"use client";

interface ShopHeroProps {
    tenantName?: string;
    onShopNow: () => void;
    className?: string;
}

export function ShopHero({ tenantName, onShopNow, className = "" }: ShopHeroProps) {
    return (
        <div className={`relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden ${className}`}>
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full opacity-50" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full opacity-30" />
            </div>

            <div className="container relative z-10 mx-auto px-4 text-center">
                <span className="inline-block mb-4 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 backdrop-blur-sm">
                    New Collection Available
                </span>
                <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
                    Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Premium</span> Quality
                </h1>
                <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400">
                    Explore our curated selection of top-tier products designed to elevate your lifestyle.
                    Shop with confidence and enjoy seamless delivery.
                </p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={onShopNow}
                        className="rounded-full bg-white px-8 py-3.5 font-semibold text-black transition hover:bg-gray-200"
                    >
                        Shop Now
                    </button>
                </div>
            </div>
        </div>
    );
}
