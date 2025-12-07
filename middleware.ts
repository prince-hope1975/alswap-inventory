import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  "/",
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
  "/api/trpc",
];

/**
 * Public asset patterns (images, fonts, etc.)
 */
const publicAssetPatterns = [
  /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/,
  /^\/_next\//,
  /^\/favicon\.ico$/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Using console.error to ensure it bypasses some stdout buffering in certain dev environments
  console.error(`[Middleware] Processing ${pathname}`);
  console.error(`[Middleware] Session user:`, session?.user);

  // Allow public assets
  if (
    publicAssetPatterns.some((pattern) => pattern.test(pathname)) ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image")
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to home page
  if (!session?.user) {
    console.error(`[Middleware] Unauthorized access to ${pathname}, redirecting to /`);
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Allow authenticated users (including non-admin) to access home page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // For all other routes, only admin users are allowed
  if (session.user.role !== "ADMIN") {
    console.error(`[Middleware] Non-admin access to ${pathname}, role: ${session.user.role}`);
    // Check if the user is trying to access a route they shouldn't
    // For now, redirecting to home
    return NextResponse.redirect(new URL("/", req.url));
  }

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
