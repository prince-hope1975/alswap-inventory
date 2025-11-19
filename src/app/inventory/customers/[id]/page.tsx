import { api, HydrateClient } from "~/trpc/server";
import { notFound } from "next/navigation";
import { CustomerHistory } from "./customer-history";

export default async function CustomerHistoryPage(props: {
    params: Promise<{ id: string }>;
}) {
    const params = await props.params;
    const customer = await api.crm.getCustomer({ id: params.id });

    if (!customer) {
        notFound();
    }

    return (
        <HydrateClient>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Purchase History
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {customer.name}
                    </p>
                </div>
                <CustomerHistory customer={customer} />
            </div>
        </HydrateClient>
    );
}


