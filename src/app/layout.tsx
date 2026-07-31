import "~/styles/globals.css";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { BrandColorProvider } from "~/lib/brand-colors";
import { requestBaseUrl } from "~/lib/seo/base-url";
import { api } from "~/trpc/server";
import { getBrandColorStyles } from "~/lib/brand-colors-server";
import { ThemeScript } from "~/components/theme-script";
import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "~/components/error-boundary";

export async function generateMetadata(): Promise<Metadata> {
  const base = await requestBaseUrl();
  let storeName = "Alswap";
  try {
    const { tenant } = await api.shop.getShopDetails();
    if (tenant?.name) storeName = tenant.name;
  } catch {
    // Storefront is still resolvable without branding; fall back to the default.
  }
  const description = `${storeName} — electrical, electronics and solar supplies.`;
  return {
    // Without metadataBase every relative canonical in the app resolves
    // against http://localhost:3000.
    metadataBase: new URL(base),
    title: { default: storeName, template: `%s | ${storeName}` },
    description,
    // icon.png / apple-icon.png / opengraph-image.png are file-convention
    // routes Next wires up automatically — no `icons:` entry needed here.
    openGraph: {
      siteName: storeName,
      title: storeName,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: storeName,
      description,
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
