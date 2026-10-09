"use client";

import { cn } from "~/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  isAwaitingOnlinePayment,
  manualStatusChangeError,
  orderStatusLabel,
  stockEffectOfStatusChange,
} from "~/lib/domain/order-status";
import { DELIVERY_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL, enumLabel as label } from "~/lib/domain/order-labels";
import { api } from "~/trpc/react";
import { useCurrency } from "~/hooks/use-tenant-settings";
import { CheckCircle, Search } from "lucide-react";
import { toast } from "~/lib/toast";
import { Dialog } from "~/components/ui/dialog";
import { useConfirm } from "~/components/ui/confirm-dialog";
import { LoadError } from "~/components/ui/load-error";
import { Skeleton, SkeletonRows } from "~/components/ui/skeleton";
import { btnDanger, btnSecondary, inputCls, labelCls, rowFocus } from "~/components/ui/styles";

type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";
type StatusFilter = OrderStatus | "AWAITING_PAYMENT";
type DeliveryMethod = "PICKUP" | "DELIVERY";

const STATUS_FILTERS: readonly StatusFilter[] = ["PENDING", "COMPLETED", "CANCELLED", "AWAITING_PAYMENT"];
const DELIVERY_FILTERS: readonly DeliveryMethod[] = ["PICKUP", "DELIVERY"];
const STATUS_LABEL = ORDER_STATUS_LABEL;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
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

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { formatCurrency } = useCurrency();
  const utils = api.useUtils();
  const confirm = useConfirm();

  // Filters, search and the open order all live in the URL so they survive
  // reloads and can be shared (e.g. ?order=<id> from a notification).
  const status = pick(searchParams.get("status"), STATUS_FILTERS) ?? "ALL";
  const deliveryMethod = pick(searchParams.get("delivery"), DELIVERY_FILTERS) ?? "ALL";
  const urlSearch = searchParams.get("q") ?? "";
  const selectedId = searchParams.get("order");

  const [searchText, setSearchText] = useState(urlSearch);
  const searchRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      // Read the live URL so a debounced search never reverts a newer filter.
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
    },
    [pathname, router],
  );

  useEffect(() => {
    if (document.activeElement !== searchRef.current) setSearchText(urlSearch);
  }, [urlSearch]);
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const onSearchChange = (value: string) => {
    setSearchText(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setParams({ q: value.trim() || null }), 300);
  };

  const setSelectedId = (id: string | null) => setParams({ order: id });

  const list = api.orders.list.useInfiniteQuery(
    {
      limit: 20,
      status: status === "ALL" ? undefined : status,
      deliveryMethod: deliveryMethod === "ALL" ? undefined : deliveryMethod,
      search: urlSearch || undefined,
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
  const filtered = status !== "ALL" || deliveryMethod !== "ALL" || !!urlSearch;

  async function cancelOrder(order: Parameters<typeof stockEffectOfStatusChange>[0] & { id: string }) {
    const id = order.id;
    const restocks = stockEffectOfStatusChange(order, "CANCELLED") === "restore";
    const ok = await confirm({
      title: `Cancel order #${id.slice(0, 8)}?`,
      message: `${restocks ? "Its items go back into stock. " : ""}The customer is not notified automatically.`,
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      destructive: true,
    });
    if (ok) updateStatus.mutate({ id, status: "CANCELLED" });
  }

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
      <div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Orders</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            View storefront and POS orders, payment status, delivery/pickup, and customer details.
          </p>
        </div>

      </div>

      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] dark:border-gray-700 dark:bg-gray-800">
        <div>
          <label htmlFor="orders-search" className={cn(labelCls, "mb-1 text-xs")}>
            Search
          </label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              ref={searchRef}
              id="orders-search"
              type="search"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Order #, customer name, email or phone"
              maxLength={100}
              className={`${inputCls} pl-10`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="orders-status" className={cn(labelCls, "mb-1 text-xs")}>
            Status
          </label>
          <select
            id="orders-status"
            value={status}
            onChange={(e) => setParams({ status: e.target.value === "ALL" ? null : e.target.value, order: null })}
            className={inputCls}
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="AWAITING_PAYMENT">Awaiting online payment</option>
          </select>
        </div>
        <div>
          <label htmlFor="orders-delivery" className={cn(labelCls, "mb-1 text-xs")}>
            Delivery
          </label>
          <select
            id="orders-delivery"
            value={deliveryMethod}
            onChange={(e) => setParams({ delivery: e.target.value === "ALL" ? null : e.target.value, order: null })}
            className={inputCls}
          >
            <option value="ALL">All</option>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </div>
      </div>

      {list.isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <SkeletonRows rows={6} label="Loading orders" />
        </div>
      ) : list.error ? (
        <LoadError
          title="Couldn't load orders."
          message={list.error.message}
          onRetry={() => void list.refetch()}
          retrying={list.isRefetching}
        />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          {filtered ? (
            <>
              <p className="font-semibold text-gray-900 dark:text-white">No orders match</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try a different search, status or delivery filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setParams({ status: null, delivery: null, q: null });
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
                      className={`cursor-pointer hover:bg-gray-50 focus-visible:bg-gray-50 dark:hover:bg-gray-900/30 dark:focus-visible:bg-gray-900/30 ${rowFocus}`}
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
              {list.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}

      {/* Detail drawer: closing it also clears ?order= */}
      <Dialog
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        variant="right"
        title={selectedId ? `Order #${selectedId.slice(0, 8)}` : "Order"}
        description={selected.data ? new Date(selected.data.createdAt).toLocaleString() : undefined}
        closeLabel="Close order details"
        bodyClassName="p-0"
      >
        {selectedId && (
          <>
            {selected.isLoading ? (
              <div role="status" aria-label="Loading order" className="space-y-4 p-6">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : selected.error ? (
              <div className="p-6">
                <LoadError
                  title="Couldn't load this order."
                  message={selected.error.message}
                  onRetry={() => void selected.refetch()}
                  retrying={selected.isRefetching}
                />
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
                      title={manualStatusChangeError(selected.data, "PENDING") ?? undefined}
                      className={btnSecondary}
                    >
                      Set pending
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus.mutate({ id: selected.data!.id, status: "COMPLETED" })}
                      disabled={updateStatus.isPending || selected.data.status === "COMPLETED" || !!manualStatusChangeError(selected.data, "COMPLETED")}
                      title={manualStatusChangeError(selected.data, "COMPLETED") ?? undefined}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500 focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-focus)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Mark completed
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelOrder(selected.data!)}
                      disabled={updateStatus.isPending || selected.data.status === "CANCELLED"}
                      className={btnDanger}
                    >
                      Cancel order
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}



