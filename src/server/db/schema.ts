import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTableCreator,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
  decimal,
  text,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `alswap-inventory_${name}`);

export const userRoles = pgEnum("user_role", ["ADMIN", "MANAGER", "CASHIER", "USER"]);
export const shiftStatus = pgEnum("shift_status", ["OPEN", "CLOSED"]);
export const orderStatus = pgEnum("order_status", ["PENDING", "COMPLETED", "CANCELLED"]);
export const purchaseOrderStatus = pgEnum("purchase_order_status", ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"]);
export const orderDeliveryMethod = pgEnum("order_delivery_method", ["PICKUP", "DELIVERY"]);
export const inventoryMovementType = pgEnum("inventory_movement_type", [
  "OPENING_BALANCE",
  "PURCHASE_RECEIPT",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
  "COUNT_VARIANCE",
]);
export const documentJobStatus = pgEnum("document_job_status", [
  "UPLOADED",
  "QUEUED",
  "PROCESSING",
  "REVIEW",
  "APPROVED",
  "REJECTED",
  "FAILED",
]);
export const documentType = pgEnum("document_type", ["SUPPLIER_INVOICE", "CUSTOMER_RECEIPT"]);
export const solarLeadStatus = pgEnum("solar_lead_status", [
  "NEW",
  "SURVEY_REQUESTED",
  "SURVEY_CONFIRMED",
  "QUOTED",
  "DEPOSIT_PAID",
  "INSTALLING",
  "COMPLETED",
  "LOST",
]);

// --- Multi-tenancy Core ---

export const tenants = createTable(
  "tenant",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    slug: d.varchar({ length: 255 }).notNull().unique(),
    customDomain: d.varchar("custom_domain", { length: 255 }),
    logo: d.varchar({ length: 255 }),
    brandColor: d.varchar({ length: 50 }).default("#000000"),
    primaryColorLight: d.varchar("primary_color_light", { length: 50 }).default("#9333EA"),
    primaryColorDark: d.varchar("primary_color_dark", { length: 50 }).default("#A855F7"),
    currency: d.varchar("currency", { length: 10 }).default("₦"),
    location: d.varchar("location", { length: 255 }),
    address: d.text(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    phone: d.varchar({ length: 50 }),
    paystackPublicKey: d.text("paystack_public_key"),
    // Encrypted-at-rest (application-layer encryption)
    paystackSecretKey: d.text("paystack_secret_key"),
    receiptTemplate: d.varchar("receipt_template", { length: 50 }).default("classic"),
    receiptFooter: d.text("receipt_footer"),
    storeConfig: d.json("store_config").$type<{
      template: "modern" | "classic" | "marketplace" | "minimal" | "boutique" | "conversion" | "beauty";
      themeMode: "system" | "light" | "dark";
      showHero: boolean;
      showArticles: boolean;
      primaryColor?: string;
      heroTitle?: string;
      heroDescription?: string;
      deliveryFee?: number;
      deliveryPricing?: {
        type: "flat" | "distance";
        baseFee?: number;
        perKmFee?: number;
        maxKm?: number;
      };
    }>().default({
      template: "modern",
      themeMode: "system",
      showHero: true,
      showArticles: false,
    }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("tenant_slug_idx").on(t.slug),
    uniqueIndex("tenant_custom_domain_idx").on(t.customDomain),
  ],
);

// --- Auth & Users ---

export const users = createTable("user", (d) => ({
  id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: d.varchar({ length: 255 }).references(() => tenants.id), // Nullable for super admins or initial setup
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: timestamp("emailVerified", {
    mode: "date",
    withTimezone: true,
  }),
  password: varchar("password", { length: 255 }),
  image: varchar("image", { length: 255 }),
  role: userRoles("role").default("CASHIER"),
  createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  accounts: many(accounts),
  shifts: many(shifts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Inventory Module ---

export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    name: d.varchar({ length: 255 }).notNull(),
    slug: d.varchar({ length: 255 }),
  }),
  (t) => [index("category_tenant_idx").on(t.tenantId)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  productCategories: many(productCategories),
}));

export const suppliers = createTable(
  "supplier",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    name: d.varchar({ length: 255 }).notNull(),
    contactPerson: d.varchar({ length: 255 }),
    email: d.varchar({ length: 255 }),
    phone: d.varchar({ length: 255 }),
    address: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("supplier_tenant_idx").on(t.tenantId)],
);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

export const products = createTable(
  "product",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    categoryId: d.integer().references(() => categories.id),
    supplierId: d.varchar({ length: 255 }).references(() => suppliers.id),
    name: d.varchar({ length: 255 }).notNull(),
    slug: d.varchar({ length: 255 }),
    description: d.text(),
    image: d.varchar({ length: 255 }),
    images: d.json().$type<string[]>(),
    barcode: d.varchar({ length: 255 }), // Scannable code
    sku: d.varchar({ length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
    salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    stockQuantity: d.integer().notNull().default(0),
    lowStockThreshold: d.integer().default(5),
    baseUnit: d.varchar("base_unit", { length: 32 }).default("piece").notNull(),
    specifications: d.json().$type<Record<string, string | number | boolean>>(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("product_tenant_idx").on(t.tenantId),
    index("product_barcode_idx").on(t.barcode),
    uniqueIndex("product_tenant_slug_idx").on(t.tenantId, t.slug),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  purchaseOrderItems: many(purchaseOrderItems),
  productCategories: many(productCategories),
  reviews: many(reviews),
}));

// --- Product Categories Junction Table (Many-to-Many) ---

export const productCategories = createTable(
  "product_category",
  (d) => ({
    productId: d.varchar({ length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: d.integer().notNull().references(() => categories.id, { onDelete: "cascade" }),
  }),
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index("pc_product_idx").on(t.productId),
    index("pc_category_idx").on(t.categoryId),
  ],
);

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));

export const purchaseOrders = createTable(
  "purchase_order",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    supplierId: d.varchar({ length: 255 }).references(() => suppliers.id),
    status: purchaseOrderStatus("status").default("DRAFT").notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
    expectedDate: d.timestamp({ withTimezone: true }),
    receivedDate: d.timestamp({ withTimezone: true }),
    notes: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("po_tenant_idx").on(t.tenantId)],
);

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItems = createTable(
  "purchase_order_item",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    purchaseOrderId: d.varchar({ length: 255 }).notNull().references(() => purchaseOrders.id),
    productId: d.varchar({ length: 255 }).notNull().references(() => products.id),
    quantity: d.integer().notNull(),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
    receivedQuantity: d.integer().default(0),
  }),
);

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
  product: one(products, { fields: [purchaseOrderItems.productId], references: [products.id] }),
}));

// --- Stock Units, Variants & Ledger ---

export const productVariants = createTable(
  "product_variant",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    productId: d.varchar({ length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
    name: d.varchar({ length: 255 }).notNull(),
    sku: d.varchar({ length: 255 }),
    barcode: d.varchar({ length: 255 }),
    attributes: d.json().$type<Record<string, string>>(),
    retailPrice: decimal("retail_price", { precision: 12, scale: 2 }).notNull(),
    wholesalePrice: decimal("wholesale_price", { precision: 12, scale: 2 }),
    averageUnitCost: decimal("average_unit_cost", { precision: 12, scale: 4 }).default("0").notNull(),
    stockQuantity: decimal("stock_quantity", { precision: 14, scale: 3 }).default("0").notNull(),
    baseUnit: d.varchar("base_unit", { length: 32 }).default("piece").notNull(),
    isActive: d.boolean("is_active").default(true).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("product_variant_tenant_idx").on(t.tenantId),
    index("product_variant_product_idx").on(t.productId),
    uniqueIndex("product_variant_tenant_sku_idx").on(t.tenantId, t.sku),
    uniqueIndex("product_variant_tenant_barcode_idx").on(t.tenantId, t.barcode),
  ],
);

export const unitConversions = createTable(
  "unit_conversion",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    productVariantId: d.varchar("product_variant_id", { length: 255 }).notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    unitName: d.varchar("unit_name", { length: 32 }).notNull(),
    factorToBase: decimal("factor_to_base", { precision: 14, scale: 4 }).notNull(),
    sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }),
  }),
  (t) => [uniqueIndex("unit_conversion_variant_unit_idx").on(t.productVariantId, t.unitName)],
);

export const inventoryMovements = createTable(
  "inventory_movement",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    productVariantId: d.varchar("product_variant_id", { length: 255 }).notNull().references(() => productVariants.id),
    type: inventoryMovementType("type").notNull(),
    quantityDelta: decimal("quantity_delta", { precision: 14, scale: 3 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 12, scale: 4 }),
    referenceType: d.varchar("reference_type", { length: 50 }),
    referenceId: d.varchar("reference_id", { length: 255 }),
    reason: d.text(),
    createdByUserId: d.varchar("created_by_user_id", { length: 255 }).references(() => users.id),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("inventory_movement_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("inventory_movement_variant_created_idx").on(t.productVariantId, t.createdAt),
  ],
);

// --- CRM Module ---

export const customers = createTable(
  "customer",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    name: d.varchar({ length: 255 }).notNull(),
    email: d.varchar({ length: 255 }),
    phone: d.varchar({ length: 255 }),
    loyaltyPoints: d.integer().default(0),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("customer_tenant_idx").on(t.tenantId)],
);

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

// --- POS Module ---

export const shifts = createTable(
  "shift",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    startTime: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    endTime: d.timestamp({ withTimezone: true }),
    startCash: decimal("start_cash", { precision: 10, scale: 2 }).default("0"),
    endCash: decimal("end_cash", { precision: 10, scale: 2 }),
    status: shiftStatus("status").default("OPEN").notNull(),
  }),
  (t) => [index("shift_tenant_idx").on(t.tenantId)],
);

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  user: one(users, { fields: [shifts.userId], references: [users.id] }),
  orders: many(orders),
}));

export const orders = createTable(
  "order",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    shiftId: d.varchar({ length: 255 }).references(() => shifts.id),
    customerId: d.varchar({ length: 255 }).references(() => customers.id),
    clientOrderId: d.varchar("client_order_id", { length: 255 }),
    createdByUserId: d.varchar("created_by_user_id", { length: 255 }).references(() => users.id),
    isHistoricalImport: d.boolean("is_historical_import").default(false).notNull(),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatus("status").default("COMPLETED").notNull(),
    paymentMethod: d.varchar({ length: 50 }).default("CASH"),
    deliveryMethod: orderDeliveryMethod("delivery_method").default("PICKUP").notNull(),
    deliveryAddress: d.text("delivery_address"),
    deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }),
    customerName: d.varchar("customer_name", { length: 255 }),
    customerEmail: d.varchar("customer_email", { length: 255 }),
    customerPhone: d.varchar("customer_phone", { length: 50 }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("order_tenant_idx").on(t.tenantId),
    uniqueIndex("order_tenant_client_id_idx").on(t.tenantId, t.clientOrderId),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shift: one(shifts, { fields: [orders.shiftId], references: [shifts.id] }),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
}));

export const orderItems = createTable(
  "order_item",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    orderId: d.varchar({ length: 255 }).notNull().references(() => orders.id),
    productId: d.varchar({ length: 255 }).notNull().references(() => products.id),
    quantity: d.integer().notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Price at time of sale
  }),
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

// --- Admin Notifications (simple in-app notifications for tenant admins) ---

export const adminNotifications = createTable(
  "admin_notification",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    type: d.varchar({ length: 100 }).notNull(), // e.g. DELIVERY_ORDER
    title: d.varchar({ length: 255 }).notNull(),
    message: d.text(),
    data: d.json("data").$type<Record<string, unknown>>(),
    isRead: d.boolean("is_read").notNull().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("admin_notification_tenant_idx").on(t.tenantId)],
);

export const adminNotificationsRelations = relations(adminNotifications, ({ one }) => ({
  tenant: one(tenants, { fields: [adminNotifications.tenantId], references: [tenants.id] }),
}));

// --- Reviews ---

export const reviews = createTable(
  "review",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    productId: d.varchar({ length: 255 }).notNull().references(() => products.id, { onDelete: "cascade" }),
    customerName: d.varchar({ length: 255 }).notNull(),
    customerEmail: d.varchar({ length: 255 }).notNull(),
    rating: d.integer().notNull(),
    title: d.varchar({ length: 255 }),
    body: d.text(),
    isApproved: d.boolean("is_approved").notNull().default(false),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [
    index("review_tenant_idx").on(t.tenantId),
    index("review_product_idx").on(t.productId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tenant: one(tenants, { fields: [reviews.tenantId], references: [tenants.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

// --- Articles ---

export const articles = createTable(
  "article",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    title: d.varchar({ length: 255 }).notNull(),
    slug: d.varchar({ length: 255 }).notNull(),
    excerpt: d.text(),
    content: d.text(),
    coverImage: d.varchar("cover_image", { length: 500 }),
    authorName: d.varchar("author_name", { length: 255 }),
    isPublished: d.boolean("is_published").notNull().default(false),
    publishedAt: d.timestamp("published_at", { withTimezone: true }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("article_tenant_idx").on(t.tenantId),
    index("article_slug_idx").on(t.slug),
  ],
);

export const articlesRelations = relations(articles, ({ one }) => ({
  tenant: one(tenants, { fields: [articles.tenantId], references: [tenants.id] }),
}));

// --- OCR Document Inbox ---

export const documentJobs = createTable(
  "document_job",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    uploadedByUserId: d.varchar("uploaded_by_user_id", { length: 255 }).notNull().references(() => users.id),
    type: documentType("type"),
    status: documentJobStatus("status").default("UPLOADED").notNull(),
    objectKey: d.text("object_key").notNull(),
    fileName: d.varchar("file_name", { length: 255 }).notNull(),
    mimeType: d.varchar("mime_type", { length: 100 }).notNull(),
    sha256: d.varchar({ length: 64 }).notNull(),
    provider: d.varchar({ length: 50 }),
    providerModel: d.varchar("provider_model", { length: 100 }),
    rawExtraction: d.json("raw_extraction").$type<Record<string, unknown>>(),
    draft: d.json().$type<Record<string, unknown>>(),
    failureMessage: d.text("failure_message"),
    approvedByUserId: d.varchar("approved_by_user_id", { length: 255 }).references(() => users.id),
    approvedAt: d.timestamp("approved_at", { withTimezone: true }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("document_job_tenant_status_idx").on(t.tenantId, t.status),
    uniqueIndex("document_job_tenant_hash_idx").on(t.tenantId, t.sha256),
  ],
);

// --- Solar Leads & Installations ---

export const solarInstallers = createTable(
  "solar_installer",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    name: d.varchar({ length: 255 }).notNull(),
    phone: d.varchar({ length: 50 }).notNull(),
    email: d.varchar({ length: 255 }),
    serviceAreas: d.json("service_areas").$type<string[]>(),
    commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
    isActive: d.boolean("is_active").default(true).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("solar_installer_tenant_idx").on(t.tenantId)],
);

export const solarLeads = createTable(
  "solar_lead",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: d.varchar({ length: 255 }).notNull().references(() => tenants.id),
    name: d.varchar({ length: 255 }).notNull(),
    phone: d.varchar({ length: 50 }).notNull(),
    email: d.varchar({ length: 255 }),
    location: d.text().notNull(),
    status: solarLeadStatus("status").default("SURVEY_REQUESTED").notNull(),
    estimateInput: d.json("estimate_input").$type<Record<string, unknown>>().notNull(),
    estimateResult: d.json("estimate_result").$type<Record<string, unknown>>().notNull(),
    attribution: d.json().$type<Record<string, string>>(),
    preferredSurveySlots: d.json("preferred_survey_slots").$type<string[]>(),
    assignedInstallerId: d.varchar("assigned_installer_id", { length: 255 }).references(() => solarInstallers.id),
    notes: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("solar_lead_tenant_status_idx").on(t.tenantId, t.status)],
);
