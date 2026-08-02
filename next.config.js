/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        // Cloudinary URLs are versioned and immutable. Keep optimized variants
        // warm for the same 30-day lifetime advertised by their origin.
        minimumCacheTTL: 60 * 60 * 24 * 30,
        formats: ["image/webp"],
        // Uploads are capped at 1200px, so larger generated variants only add
        // cache keys and bandwidth without adding source detail.
        deviceSizes: [320, 480, 640, 750, 828, 1080, 1200],
        imageSizes: [32, 48, 64, 96, 128, 256],
        // `domains` is deprecated in Next 15 in favour of remotePatterns.
        remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
        ],
    },
};

export default config;
