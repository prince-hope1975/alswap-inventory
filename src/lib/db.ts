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
    // Search optimization fields
    searchTokens?: string; // Concatenated lowercase search fields
    salesCount?: number; // Track popularity for ranking
    categoryId?: number | null; // For category-based boosting
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
        clientOrderId: string;
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
        
        this.version(3).stores({
            products: "id, name, sku, barcode, tenantId, searchTokens, salesCount, categoryId", // Enhanced indices
            customers: "id, name, email, phone, tenantId",
            pendingOrders: "++id, synced, createdAt",
            settings: "key"
        }).upgrade(trans => {
            // Migrate synced field from boolean to number if needed
            return trans.table("pendingOrders").toCollection().modify((order: any) => {
                if (typeof order.synced === "boolean") {
                    order.synced = order.synced ? 1 : 0;
                }
            });
        });
    }

    // Helper method to build search tokens when adding products
    async addProductsWithTokens(products: Omit<LocalProduct, 'searchTokens'>[]) {
        const productsWithTokens = products.map(p => ({
            ...p,
            searchTokens: [p.name, p.sku, p.barcode]
                .filter(Boolean)
                .join(' ')
                .toLowerCase(),
            salesCount: p.salesCount ?? 0
        }));
        return this.products.bulkAdd(productsWithTokens as LocalProduct[]);
    }

    // Increment sales count for a product
    async incrementSalesCount(productId: string, quantity: number) {
        const product = await this.products.get(productId);
        if (product) {
            await this.products.update(productId, {
                salesCount: (product.salesCount ?? 0) + quantity
            });
        }
    }
}

export const db = new PosDatabase();
