import { auth } from "~/server/auth";
import { getTenantBranding } from "~/lib/tenant-branding";
import { RouterProvider } from "~/lib/routerProvider";
import { InventoryLayoutClient } from "../inventory/inventory-layout-client";

/**
 * Sales pages share the staff dashboard shell (role-filtered nav, working
 * mobile menu) instead of keeping a second, static copy of the sidebar.
 */
export default async function SalesLayout({
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
        </RouterProvider>
    );
}
