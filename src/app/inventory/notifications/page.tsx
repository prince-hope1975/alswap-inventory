"use client";

import { cn } from "~/lib/utils";
import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { AlertTriangle, Bell, Check } from "lucide-react";
import { toast } from "~/lib/toast";
import { LoadError } from "~/components/ui/load-error";
import { SkeletonRows } from "~/components/ui/skeleton";
import { btnPrimary, btnSecondary, checkboxCls } from "~/components/ui/styles";

/** Payment/stock problems on an order that staff must resolve by hand. */
const NEEDS_ATTENTION = "ORDER_NEEDS_ATTENTION";

function orderIdOf(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const id = (data as Record<string, unknown>).orderId;
  return typeof id === "string" ? id : null;
}

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const utils = api.useUtils();

  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.notifications.list.useInfiniteQuery(
      { limit: 20, unreadOnly },
      {
        getNextPageParam: (last) => last.nextCursor,
      },
    );

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast.error(`Could not mark as read: ${e.message}`),
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      toast.success("All notifications marked as read");
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast.error(`Could not mark all as read: ${e.message}`),
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const { data: unread } = api.notifications.unreadCount.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Delivery orders and important store events.
          </p>
        </div>

        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unread?.count === 0}
          className={btnSecondary}
        >
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className={checkboxCls}
          />
          Unread only
        </label>
      </div>

      {error ? (
        <LoadError
          title="Couldn't load notifications."
          message={error.message}
          onRetry={() => void refetch()}
          retrying={isRefetching}
        />
      ) : isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <SkeletonRows rows={4} label="Loading notifications" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-100)] text-[var(--brand-primary-600)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-400)]">
            <Bell className="h-6 w-6" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {unreadOnly ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Order and delivery notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const attention = n.type === NEEDS_ATTENTION;
            const orderId = orderIdOf(n.data);
            return (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 shadow-sm ${
                attention && !n.isRead
                  ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  : n.isRead
                  ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                  : "border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] dark:border-[var(--brand-primary-700)]/40 dark:bg-[var(--brand-primary-900)]/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {attention && (
                    <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      Needs attention
                    </span>
                  )}
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {n.message}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                    {orderId && (
                      <Link
                        href={`/inventory/orders?order=${encodeURIComponent(orderId)}`}
                        className="font-semibold text-[var(--brand-primary-600)] hover:underline dark:text-[var(--brand-primary-400)]"
                      >
                        Open order &rarr;
                      </Link>
                    )}
                  </p>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate({ id: n.id })}
                    disabled={markRead.isPending && markRead.variables?.id === n.id}
                    aria-label={`Mark "${n.title}" as read`}
                    className={cn(btnPrimary, "shrink-0 px-3 py-1.5 text-xs")}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Mark read
                  </button>
                )}
              </div>
            </div>
            );
          })}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className={`${btnSecondary} w-full`}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}




