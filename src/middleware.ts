import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "~/server/auth/auth.config";
import { resolveSurfaceRoute, type SurfaceLabel } from "~/lib/seo/host";

const { auth } = NextAuth(authConfig);

/**
 * Lets server components branch on surface without re-parsing the host.
 * Deliberately brand-neutral: this codebase is a multi-tenant template, so the
 * deployed brand (SPPD Amaks today) lives in tenant config, never in code.
 */
const SURFACE_HEADER = "x-storefront-surface";

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

/**
 * The private surface must never be indexed, on any response it produces —
 * rewrites, redirects and pass-throughs alike.
 */
function tag(response: NextResponse, surface: SurfaceLabel | null) {
  if (surface) response.headers.set(SURFACE_HEADER, surface);
  if (surface === "app") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export default auth((req) => {
  const session = req.auth;
  const rawHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");

  // 1. Resolve the surface and *compute* — but do not yet apply — the route it
  //    maps to. Returning a rewrite here would skip the auth check below and
  //    make /inventory anonymously reachable on app.<root>. The role gates
  //    match on pathname.startsWith("/pos") etc., so they must also see the
  //    rewritten path or they silently become no-ops.
  const route = resolveSurfaceRoute(
    rawHost,
    req.nextUrl.pathname,
    req.nextUrl.search.replace(/^\?/, ""),
  );
  const { surface } = route;
  const pathname = route.pathname;

  // 2. Apply the computed route only once every check below has passed.
  const proceed = () => {
    if (!route.rewritten) {
      const headers = new Headers(req.headers);
      // Drop any inbound value before setting our own: the surface header is
      // trusted downstream, so a client must not be able to supply it.
      headers.delete(SURFACE_HEADER);
      if (surface) headers.set(SURFACE_HEADER, surface);
      return tag(NextResponse.next({ request: { headers } }), surface);
    }
    const url = req.nextUrl.clone();
    url.pathname = route.pathname;
    url.search = route.search ? `?${route.search}` : "";
    const headers = new Headers(req.headers);
    if (surface) headers.set(SURFACE_HEADER, surface);
    return tag(NextResponse.rewrite(url, { request: { headers } }), surface);
  };

  // On app.<root> the root path rewrites to /inventory, so bouncing a rejected
  // request to "/" would rewrite straight back to /inventory — an infinite
  // redirect loop. Both fallbacks below are public routes that are served
  // as-is on every surface, so the chain terminates.
  const rejectTo = (path: string, appFallback?: string) =>
    tag(
      NextResponse.redirect(
        new URL(surface === "app" && appFallback ? appFallback : path, req.url),
      ),
      surface,
    );

  // Allow public assets
  if (
    publicAssetPatterns.some((pattern) => pattern.test(pathname)) ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image")
  ) {
    return proceed();
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return proceed();
  }

  // Allow public API routes
  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return proceed();
  }

  // If not authenticated, redirect away
  if (!session?.user) {
    return rejectTo("/", "/auth/signin");
  }

  // Allow authenticated users (including non-admin) to access home page
  if (pathname === "/") {
    return proceed();
  }

  const role = session.user.role;
  const cashierRoutes = ["/pos", "/sales", "/inventory/customers"];
  const managerBlockedRoutes = ["/inventory/settings", "/inventory/users"];

  if (role === "CASHIER" && !cashierRoutes.some((route) => pathname.startsWith(route))) {
    return rejectTo("/pos");
  }
  if (role === "MANAGER" && managerBlockedRoutes.some((route) => pathname.startsWith(route))) {
    return rejectTo("/inventory");
  }
  // A signed-in USER has no back-office access; on app. send them to the
  // storefront rather than to "/", which rewrites back into /inventory.
  if (role === "USER") return rejectTo("/", "/shop");

  // Admin users can access all routes
  return proceed();
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
