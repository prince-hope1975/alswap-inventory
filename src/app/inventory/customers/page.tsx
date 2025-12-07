import { api, HydrateClient } from "~/trpc/server";
import { CustomerList } from "./customer-list";

export default async function CustomersPage() {
    const customers = await api.crm.listCustomers();

    return (
        <HydrateClient>
            <CustomerList initialCustomers={customers} />
        </HydrateClient>
    );
}




