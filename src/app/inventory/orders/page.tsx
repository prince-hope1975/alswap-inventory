"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { CheckCircle, RefreshCw, X } from "lucide-react";

type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";
type DeliveryMethod = "PICKUP" | "DELIVERY";

function Badge({ children, tone }: { children: string; tone: "gray" | "green" | "yellow" | "red" | "blue" }) {
  const toneCls =
    tone === "green"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : tone === "yellow"
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
        : tone === "red"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          : tone === "blue"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${toneCls}`}>
      {children}
    </span>
  );
}

export default function OrdersPage() {
  const { formatCurrency } = useCurrency();
  const utils = api.useUtils();

  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = api.orders.list.useInfiniteQuery(
    {
      limit: 20,
      status: status === "ALL" ? undefined : status,
      deliveryMethod: deliveryMethod === "ALL" ? undefined : deliveryMethod,
    },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const selected = api.orders.get.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  const updateStatus = api.orders.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.orders.list.invalidate();
      if (selectedId) await utils.orders.get.invalidate({ id: selectedId });
    },
  });

  const orders = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  function isPaid(o: { status: string; paymentMethod: string | null | undefined }) {
    if (o.paymentMethod === "PAYSTACK") return o.status === "COMPLETED";
    return o.status === "COMPLETED";
  }

  function statusTone(s: OrderStatus) {
    if (s === "COMPLETED") return "green" as const;
    if (s === "PENDING") return "yellow" as const;
    return "red" as const;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Orders</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            View storefront and POS orders, payment status, delivery/pickup, and customer details.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Delivery</label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as typeof deliveryMethod)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="ALL">All</option>
              <option value="PICKUP">Pickup</option>
              <option value="DELIVERY">Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {list.isLoading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="font-semibold text-gray-900 dark:text-white">No orders yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Orders will appear here after checkout or POS sales.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Delivery</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((o) => {
                  const custName = o.customer?.name ?? o.customerName ?? "—";
                  const custEmail = o.customer?.email ?? o.customerEmail ?? "";
                  const paid = isPaid({ status: o.status, paymentMethod: o.paymentMethod });

                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      onClick={() => setSelectedId(o.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            #{o.id.slice(0, 8)}
                          </div>
                          <Badge tone={statusTone(o.status as OrderStatus)}>{o.status}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{custName}</div>
                        {custEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{custEmail}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={o.deliveryMethod === "DELIVERY" ? "blue" : "gray"}>{o.deliveryMethod}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Badge tone={paid ? "green" : "yellow"}>{paid ? "PAID" : "UNPAID"}</Badge>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{o.paymentMethod}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(o.totalAmount)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {list.hasNextPage && (
            <button
              type="button"
              onClick={() => void list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              className="w-full border-t border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {list.isFetchingNextPage ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedId(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
              <div className="min-w-0">
                <div className="text-sm text-gray-500 dark:text-gray-400">Order</div>
                <div className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  #{selectedId.slice(0, 8)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selected.isLoading ? (
              <div className="flex h-48 items-center justify-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : !selected.data ? (
              <div className="p-6 text-sm text-gray-600 dark:text-gray-300">Order not found.</div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</div>
                    <div className="mt-1">
                      <Badge tone={statusTone(selected.data.status as OrderStatus)}>
                        {selected.data.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Paid</div>
                    <div className="mt-1">
                      <Badge
                        tone={isPaid({ status: selected.data.status, paymentMethod: selected.data.paymentMethod }) ? "green" : "yellow"}
                      >
                        {isPaid({ status: selected.data.status, paymentMethod: selected.data.paymentMethod }) ? "PAID" : "UNPAID"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Customer</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">
                    {selected.data.customer?.name ?? selected.data.customerName ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selected.data.customer?.email ?? selected.data.customerEmail ?? ""}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selected.data.customer?.phone ?? selected.data.customerPhone ?? ""}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Delivery</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={selected.data.deliveryMethod === "DELIVERY" ? "blue" : "gray"}>
                      {selected.data.deliveryMethod as string}
                    </Badge>
                    {selected.data.deliveryMethod === "DELIVERY" && selected.data.deliveryFee && (
                      <Badge tone="gray">Fee: {formatCurrency(selected.data.deliveryFee)}</Badge>
                    )}
                  </div>
                  {selected.data.deliveryAddress && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                      {selected.data.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Items</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(selected.data.totalAmount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {selected.data.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-sm">
                        <div className="text-gray-800 dark:text-gray-200">
                          {it.product?.name ?? it.productId} × {it.quantity}
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(Number(it.price) * it.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Actions</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data.id, status: "PENDING" })}
                      disabled={updateStatus.isPending}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Set Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data.id, status: "COMPLETED" })}
                      disabled={updateStatus.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data.id, status: "CANCELLED" })}
                      disabled={updateStatus.isPending}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


