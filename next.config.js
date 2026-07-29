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
        // `domains` is deprecated in Next 15 in favour of remotePatterns.
        remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
        ],
    },
};

export default config;
