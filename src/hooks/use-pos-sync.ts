import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { db } from "~/lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export function usePosSync() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    // Watch pending orders count
    const pendingOrdersCount = useLiveQuery(
        () => db.pendingOrders.where("synced").equals(0).count()
    );

    // Fetch offline data from server
    // We use a long staleTime because we only want to fetch this when explicitly requested or on mount if empty
    const { data: offlineData, refetch: refetchOfflineData, isFetching: isPulling } = api.pos.getOfflineData.useQuery(undefined, {
        enabled: isOnline,
        staleTime: 1000 * 60 * 60, // 1 hour
        refetchOnWindowFocus: false,
    });

    const createOrderMutation = api.pos.createOrder.useMutation();

    // Monitor online status
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    // Sync Data to Local DB (Pull)
    useEffect(() => {
        if (offlineData) {
            const syncData = async () => {
                try {
                    await db.transaction("rw", db.products, db.customers, async () => {
                        // Clear existing data to avoid duplicates/stale data
                        // In a more advanced version, we might diff, but for now full replace is safer
                        await db.products.clear();
                        await db.customers.clear();

                        if (offlineData.products.length > 0) {
                            await db.products.bulkAdd(offlineData.products.map(p => ({
                                id: p.id,
                                name: p.name,
                                price: p.price,
                                sku: p.sku,
                                barcode: p.barcode,
                                stockQuantity: p.stockQuantity,
                                image: p.image,
                                tenantId: p.tenantId,
                            })));
                        }

                        if (offlineData.customers.length > 0) {
                            await db.customers.bulkAdd(offlineData.customers.map(c => ({
                                id: c.id,
                                name: c.name,
                                email: c.email,
                                phone: c.phone,
                                loyaltyPoints: c.loyaltyPoints,
                                tenantId: c.tenantId,
                            })));
                        }
                    });
                    setLastSyncTime(new Date());
                } catch (error) {
                    console.error("Failed to sync offline data to Dexie:", error);
                }
            };
            void syncData();
        }
    }, [offlineData]);

    // Sync Pending Orders to Server (Push)
    const syncPendingOrders = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        const pendingOrders = await db.pendingOrders.where("synced").equals(0).toArray();
        if (pendingOrders.length === 0) return;

        setIsSyncing(true);
        try {
            for (const order of pendingOrders) {
                try {
                    await createOrderMutation.mutateAsync({
                        shiftId: order.orderData.shiftId,
                        customerId: order.orderData.customerId,
                        items: order.orderData.items,
                        paymentMethod: order.orderData.paymentMethod,
                        amountPaid: order.orderData.amountPaid,
                    });

                    // If successful, delete from pending (or mark synced)
                    if (order.id) {
                        await db.pendingOrders.delete(order.id);
                    }
                } catch (error) {
                    console.error(`Failed to sync order ${order.id}:`, error);
                    // Keep it in pending to retry later
                }
            }
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing, createOrderMutation]);

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline && (pendingOrdersCount ?? 0) > 0) {
            void syncPendingOrders();
        }
    }, [isOnline, pendingOrdersCount, syncPendingOrders]);

    return {
        isOnline,
        isSyncing,
        isPulling,
        pendingOrdersCount: pendingOrdersCount ?? 0,
        lastSyncTime,
        pullData: refetchOfflineData,
        pushData: syncPendingOrders,
    };
}

