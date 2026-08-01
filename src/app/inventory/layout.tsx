import { auth } from "~/server/auth";
import { getTenantBranding } from "~/lib/tenant-branding";
import { RouterProvider } from "~/lib/routerProvider";
import { InventoryLayoutClient } from "./inventory-layout-client";
import { RouteErrorBoundary } from "~/components/route-error-boundary";

export default async function InventoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Host-resolved branding. See getTenantBranding: the settings router is
    // ADMIN-only, so cashiers and managers used to see the hardcoded default.
    const {
        name: companyName,
        initial: companyInitial,
        logo: companyLogo,
    } = await getTenantBranding();

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
