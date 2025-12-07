import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Get the session
  const session = await auth();

  // If not authenticated, redirect to home page
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If authenticated but not admin, redirect to home page
  if (session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin users can access all routes
  return NextResponse.next();
}

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

