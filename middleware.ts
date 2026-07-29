import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  "/",
  "/shop",
  "/solar",
  "/products",
  "/articles",
  "/about",
  "/find-us",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
];

/**
 * Public API routes that don't require authentication
 * tRPC routes are allowed here - individual procedures handle their own auth
 */
const publicApiRoutes = [
  "/api/auth",
  "/api/solar",
  "/api/trpc",
];

/**
 * Public asset patterns (images, fonts, etc.)
 */
const publicAssetPatterns = [
  /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/,
  // Crawler-facing files. The matcher below does not exclude these extensions,
  // so without this pattern robots.txt and sitemap.xml fall through to the auth
  // gate and get redirected to "/" for anonymous requests — i.e. for Googlebot.
  /\.(txt|xml|webmanifest)$/,
  /^\/_next\//,
  /^\/favicon\.ico$/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public assets
  if (
    publicAssetPatterns.some((pattern) => pattern.test(pathname)) ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image")
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to home page
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow authenticated users (including non-admin) to access home page
  if (pathname === "/") {
    return NextResponse.next();
  }

  const role = session.user.role;
  const cashierRoutes = ["/pos", "/sales", "/inventory/customers"];
  const managerBlockedRoutes = ["/inventory/settings", "/inventory/users"];

  if (role === "CASHIER" && !cashierRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/pos", req.url));
  }
  if (role === "MANAGER" && managerBlockedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/inventory", req.url));
  }
  if (role === "USER") return NextResponse.redirect(new URL("/", req.url));

  // Admin users can access all routes
  return NextResponse.next();
});

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)",
  ],
};
