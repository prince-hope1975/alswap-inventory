import { api } from "~/trpc/server";
import { notFound } from "next/navigation";
import { Receipt } from "./receipt";

export default async function ReceiptPage(props: {
    params: Promise<{ orderId: string }>;
}) {
    const params = await props.params;
    const order = await api.pos.getOrder({ id: params.orderId });

    if (!order) {
        notFound();
    }

    return <Receipt order={order} />;
}

