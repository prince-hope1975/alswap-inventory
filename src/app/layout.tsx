import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { BrandColorProvider } from "~/lib/brand-colors";
import { requestBaseUrl, requestHost } from "~/lib/seo/base-url";
import { getTenantBranding } from "~/lib/tenant-branding";
import {
  buildLandingMetadata,
  getDefaultSocialPage,
  getSocialLanding,
} from "~/lib/seo/social-metadata";
import { api } from "~/trpc/server";
import { getBrandColorStyles } from "~/lib/brand-colors-server";
import { ThemeScript } from "~/components/theme-script";
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "~/components/error-boundary";

export async function generateMetadata(): Promise<Metadata> {
  const [base, rawHost, branding] = await Promise.all([
    requestBaseUrl(),
    requestHost(),
    getTenantBranding(),
  ]);
  const { name: storeName, logo } = branding;
  const description = `${storeName} — electrical, electronics and solar supplies.`;
  const landing = getSocialLanding(rawHost, getDefaultSocialPage(rawHost));
  const landingMetadata = buildLandingMetadata(base, landing);
  const fallbackImage = logo
    ? [{ url: logo, alt: `${storeName} logo` }]
    : undefined;
  return {
    // Without metadataBase every relative canonical in the app resolves
    // against http://localhost:3000.
    metadataBase: new URL(base),
    title: { default: storeName, template: `%s | ${storeName}` },
    description,
    // icon.png and apple-icon.png remain file-convention routes. Social images
    // are explicit so each public surface can carry its own preview.
    openGraph: {
      siteName: landing.siteName ?? storeName,
      title: storeName,
      description,
      type: "website",
      images: landingMetadata.openGraph?.images ?? fallbackImage,
    },
    twitter: {
      card: landing.image || logo ? "summary_large_image" : "summary",
      title: storeName,
      description,
      images: landingMetadata.twitter?.images ?? (logo ? [logo] : undefined),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Get initial brand colors for SSR.
  //
  // This deliberately uses the public shop procedure rather than
  // settings.getTenantSettings, which is a tenantProcedure requiring an ADMIN
  // session — it threw for every anonymous visitor, so the storefront always
  // fell back to default colors instead of the tenant's own.
  let initialBrandStyles = "";
  try {
    const { tenant } = await api.shop.getShopDetails();
    initialBrandStyles = getBrandColorStyles(
      tenant?.primaryColorLight ?? "#9333EA",
      tenant?.primaryColorDark ?? "#A855F7",
    );
  } catch {
    // Fallback to defaults if the tenant cannot be resolved for this host.
    initialBrandStyles = getBrandColorStyles();
  }

  return (
    <html lang="en" className="dark">
      <head>
        <ThemeScript />
        <style
          id="brand-colors-styles"
          dangerouslySetInnerHTML={{ __html: initialBrandStyles }}
        />
      </head>
      <body className="bg-white dark:bg-gray-900">
        <ErrorBoundary componentName="RootLayout">
          <TRPCReactProvider>
            <SessionProvider>
              <BrandColorProvider>{children}</BrandColorProvider>
            </SessionProvider>
          </TRPCReactProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
