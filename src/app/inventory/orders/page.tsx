"use client";

import { use, useMemo, useState } from "react";
import {
  isAwaitingOnlinePayment,
  manualStatusChangeError,
  orderStatusLabel,
} from "~/lib/domain/order-status";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { CheckCircle, RefreshCw, X } from "lucide-react";
import { toast } from "~/lib/toast";

type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";
type StatusFilter = OrderStatus | "AWAITING_PAYMENT";
type DeliveryMethod = "PICKUP" | "DELIVERY";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
const DELIVERY_LABEL: Record<string, string> = { PICKUP: "Pickup", DELIVERY: "Delivery" };
const PAYMENT_LABEL: Record<string, string> = {
  PAYSTACK: "Paystack (online)",
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Bank transfer",
  PAY_ON_PICKUP: "Pay on pickup",
  IMPORTED: "Imported",
};

function label(map: Record<string, string>, value: string | null | undefined) {
  if (!value) return "—";
  return map[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "gray" | "green" | "yellow" | "red" | "blue" }) {
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

export default function OrdersPage(props: { searchParams: Promise<{ order?: string | string[] }> }) {
  const { order: orderParam } = use(props.searchParams);
  const { formatCurrency } = useCurrency();
  const utils = api.useUtils();

  const [status, setStatus] = useState<StatusFilter | "ALL">("ALL");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | "ALL">("ALL");
  // ?order=<id> (e.g. from a notification) opens that order's details.
  const [selectedId, setSelectedId] = useState<string | null>(
    (Array.isArray(orderParam) ? orderParam[0] : orderParam) ?? null,
  );

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
    onSuccess: async (_r, vars) => {
      toast.success(`Order marked ${label(STATUS_LABEL, vars.status).toLowerCase()}`);
      await utils.orders.list.invalidate();
      if (selectedId) await utils.orders.get.invalidate({ id: selectedId });
    },
    onError: (e) => toast.error(`Could not update order: ${e.message}`),
  });
  const filtered = status !== "ALL" || deliveryMethod !== "ALL";

  const orders = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);

  function isPaid(o: { status: string; paymentMethod: string | null | undefined }) {
    if (o.paymentMethod === "PAYSTACK") return o.status === "COMPLETED";
    return o.status === "COMPLETED";
  }

  function statusTone(o: { status: string; paymentMethod: string | null }) {
    if (isAwaitingOnlinePayment(o)) return "gray" as const;
    if (o.status === "COMPLETED") return "green" as const;
    if (o.status === "PENDING") return "yellow" as const;
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
              <option value="AWAITING_PAYMENT">Awaiting online payment</option>
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
      ) : list.error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-semibold">Couldn&apos;t load orders.</p>
          <p className="mt-1">{list.error.message}</p>
          <button
            type="button"
            onClick={() => void list.refetch()}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-300"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          {filtered ? (
            <>
              <p className="font-semibold text-gray-900 dark:text-white">No orders match</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try a different status or delivery filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("ALL");
                  setDeliveryMethod("ALL");
                }}
                className="mt-3 text-sm font-medium text-[var(--brand-primary-600)] hover:underline dark:text-[var(--brand-primary-400)]"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-900 dark:text-white">No orders yet</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Orders will appear here after checkout or POS sales.
              </p>
            </>
          )}
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
                      className="cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-gray-900/30 dark:focus-visible:bg-gray-900/30"
                      onClick={() => setSelectedId(o.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(o.id);
                        }
                      }}
                      aria-label={`Open order #${o.id.slice(0, 8)}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            #{o.id.slice(0, 8)}
                          </div>
                          <Badge tone={statusTone(o)}>{orderStatusLabel(o)}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{custName}</div>
                        {custEmail && <div className="text-xs text-gray-500 dark:text-gray-400">{custEmail}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={o.deliveryMethod === "DELIVERY" ? "blue" : "gray"}>{label(DELIVERY_LABEL, o.deliveryMethod)}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Badge tone={paid ? "green" : "yellow"}>{paid ? "Paid" : "Unpaid"}</Badge>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{label(PAYMENT_LABEL, o.paymentMethod)}</div>
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
                aria-label="Close order details"
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
                      <Badge tone={statusTone(selected.data)}>
                        {orderStatusLabel(selected.data)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Paid</div>
                    <div className="mt-1">
                      <Badge
                        tone={isPaid({ status: selected.data.status, paymentMethod: selected.data.paymentMethod }) ? "green" : "yellow"}
                      >
                        {isPaid({ status: selected.data.status, paymentMethod: selected.data.paymentMethod }) ? "Paid" : "Unpaid"}
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
                      {label(DELIVERY_LABEL, selected.data.deliveryMethod as string)}
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
                  {isAwaitingOnlinePayment(selected.data) && (
                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
                      The customer started a Paystack checkout but no payment has been confirmed. It completes
                      automatically when Paystack confirms. Cancel it if the checkout was abandoned.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data!.id, status: "PENDING" })}
                      disabled={updateStatus.isPending || selected.data.status === "PENDING" || !!manualStatusChangeError(selected.data, "PENDING")}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Set Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data!.id, status: "COMPLETED" })}
                      disabled={updateStatus.isPending || selected.data.status === "COMPLETED" || !!manualStatusChangeError(selected.data, "COMPLETED")}
                      title={manualStatusChangeError(selected.data, "COMPLETED") ?? undefined}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Cancel order #${selected.data!.id.slice(0, 8)}? The customer is not notified automatically.`)) {
                          updateStatus.mutate({ id: selected.data!.id, status: "CANCELLED" });
                        }
                      }}
                      disabled={updateStatus.isPending || selected.data.status === "CANCELLED"}
                      className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Cancel order
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



