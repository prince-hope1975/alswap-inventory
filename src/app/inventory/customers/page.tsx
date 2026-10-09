import { api, HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
    const [customers, session] = await Promise.all([
        api.crm.listCustomers(),
        auth(),
    ]);

    return (
        <HydrateClient>
            <CustomerList
                initialCustomers={customers}
                canDelete={session?.user?.role === "ADMIN"}
            />
        </HydrateClient>
    );
}
