import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { RouterProvider } from "~/lib/routerProvider";
import { InventoryLayoutClient } from "./inventory-layout-client";
import { RouteErrorBoundary } from "~/components/route-error-boundary";

export default async function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Get tenant settings for company name
    let companyName = "Alswap";
    let companyInitial = "A";
    let companyLogo: string | null = null;
    try {
        const settings = await api.settings.getTenantSettings();
        companyName = settings.name ?? "Alswap";
        companyInitial = companyName[0]?.toUpperCase() ?? "A";
        companyLogo = settings.logo ?? null;
    } catch {
        // Fallback to default if settings not available
    }

    return (
        <RouterProvider>
            <RouteErrorBoundary routeName="Inventory">
                <InventoryLayoutClient
                    companyName={companyName}
                    companyInitial={companyInitial}
                    companyLogo={companyLogo}
                    user={{
                        name: session?.user?.name,
                        role: session?.user?.role,
                    }}
                >
                    {children}
                </InventoryLayoutClient>
            </RouteErrorBoundary>
        </RouterProvider>
    );
}
