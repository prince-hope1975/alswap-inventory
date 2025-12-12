import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { BrandColorProvider } from "~/lib/brand-colors";
import { api } from "~/trpc/server";
import { getBrandColorStyles } from "~/lib/brand-colors-server";
import { ThemeScript } from "~/components/theme-script";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "SPPD AMAKS",
  description: "SPPD AMAKS Inventory & POS System",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Get initial brand colors for SSR
  let initialBrandStyles = "";
  try {
    const settings = await api.settings.getTenantSettings();
    const primaryLight = settings.primaryColorLight ?? "#9333EA";
    const primaryDark = settings.primaryColorDark ?? "#A855F7";
    initialBrandStyles = getBrandColorStyles(primaryLight, primaryDark);
  } catch {
    // Fallback to defaults if settings not available
    initialBrandStyles = getBrandColorStyles();
  }

  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <head>
        <ThemeScript />
        <style
          id="brand-colors-styles"
          dangerouslySetInnerHTML={{ __html: initialBrandStyles }}
        />
      </head>
      <body className="bg-white dark:bg-gray-900">
        <TRPCReactProvider>
          <SessionProvider>
            <BrandColorProvider>{children}</BrandColorProvider>
          </SessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
