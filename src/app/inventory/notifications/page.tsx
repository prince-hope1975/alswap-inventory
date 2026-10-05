"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { AlertTriangle, Bell, Check, RefreshCw } from "lucide-react";

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

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
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
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate();
      await utils.notifications.unreadCount.invalidate();
    },
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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
          disabled={markAllRead.isPending}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
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
            className="h-4 w-4 rounded border-gray-300 text-[var(--brand-primary-600)] focus:ring-[var(--brand-primary-500)]"
          />
          Unread only
        </label>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-gray-500">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-100)] text-[var(--brand-primary-600)] dark:bg-[var(--brand-primary-900)]/30 dark:text-[var(--brand-primary-400)]">
            <Bell className="h-6 w-6" />
          </div>
          <p className="font-semibold text-gray-900 dark:text-white">No notifications yet</p>
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
                    disabled={markRead.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary-600)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-700)] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
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
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}




