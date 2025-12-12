import Dexie, { type Table } from "dexie";

// Define interfaces for our local tables
export interface LocalProduct {
    id: string;
    name: string;
    price: string; // Stored as string to match decimal from DB
    sku?: string | null;
    barcode?: string | null;
    stockQuantity: number;
    image?: string | null;
    tenantId: string;
}

export interface LocalCustomer {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    loyaltyPoints?: number | null;
    tenantId: string;
}

export interface PendingOrder {
    id?: number; // Auto-incremented
    orderData: {
        shiftId?: string;
        customerId?: string;
        items: {
            productId: string;
            quantity: number;
            price: number;
        }[];
        paymentMethod: "CASH" | "CARD" | "TRANSFER" | "OTHER";
        amountPaid?: number;
    };
    createdAt: Date;
    synced: number; // 0 = false, 1 = true
}

export interface LocalSetting {
    key: string;
    value: any;
}

export class PosDatabase extends Dexie {
    products!: Table<LocalProduct>;
    customers!: Table<LocalCustomer>;
    pendingOrders!: Table<PendingOrder>;
    settings!: Table<LocalSetting>;

    constructor() {
        super("AlswapPosDB");
        
        this.version(2).stores({
            products: "id, name, sku, barcode, tenantId", // Index fields for searching
            customers: "id, name, email, phone, tenantId",
            pendingOrders: "++id, synced, createdAt",
            settings: "key"
        }).upgrade(trans => {
             // If we have old data with boolean synced, Dexie might handle it or we might need migration
             // But for now, just bumping version to ensure schema is fresh or updated
             // If we really wanted to migrate booleans:
             // trans.table("pendingOrders").toCollection().modify(order => {
             //    if (typeof order.synced === "boolean") order.synced = order.synced ? 1 : 0;
             // });
             // However, `upgrade` runs *after* schema change is applied but on old data? 
             // Actually, bumping version is usually enough if indices are compatible or rebuilt.
             // Boolean -> Number index might be tricky if data remains boolean.
             // Let's explicitly migrate if needed.
             return trans.table("pendingOrders").toCollection().modify((order: any) => {
                 if (typeof order.synced === "boolean") {
                     order.synced = order.synced ? 1 : 0;
                 }
             });
        });
    }
}

export const db = new PosDatabase();

