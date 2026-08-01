import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { getTenantBranding } from "~/lib/tenant-branding";
import { Receipt } from "./receipt";

export default async function ReceiptPage(props: {
    params: Promise<{ orderId: string }>;
}) {
    const params = await props.params;
    const [order, branding] = await Promise.all([
        api.pos.getOrder({ id: params.orderId }),
        getTenantBranding(),
    ]);

    if (!order) {
        notFound();
    }

    return (
        <Receipt
            order={order}
            storeName={branding.name}
            currency={branding.currency}
            footer={branding.receiptFooter}
        />
    );
}




