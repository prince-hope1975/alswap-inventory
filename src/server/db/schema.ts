import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTableCreator,
  primaryKey,
  timestamp,
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

// --- Multi-tenancy Core ---

export const tenants = createTable(
  "tenant",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }).notNull(),
    slug: d.varchar({ length: 255 }).notNull().unique(),
    logo: d.varchar({ length: 255 }),
    brandColor: d.varchar({ length: 50 }).default("#000000"),
    primaryColorLight: d.varchar("primary_color_light", { length: 50 }).default("#9333EA"),
    primaryColorDark: d.varchar("primary_color_dark", { length: 50 }).default("#A855F7"),
    currency: d.varchar("currency", { length: 10 }).default("₦"),
    location: d.varchar("location", { length: 255 }),
    address: d.text(),
    phone: d.varchar({ length: 50 }),
    receiptTemplate: d.varchar("receipt_template", { length: 50 }).default("classic"),
    receiptFooter: d.text("receipt_footer"),
    storeConfig: d.json("store_config").$type<{
      template: "modern" | "classic" | "marketplace" | "minimal" | "boutique";
      themeMode: "system" | "light" | "dark";
      showHero: boolean;
      showArticles: boolean;
      primaryColor?: string;
      heroTitle?: string;
      heroDescription?: string;
    }>().default({
      template: "modern",
      themeMode: "system",
      showHero: true,
      showArticles: false,
    }),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("tenant_slug_idx").on(t.slug)],
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
  }),
  (t) => [index("category_tenant_idx").on(t.tenantId)],
);

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
    description: d.text(),
    image: d.varchar({ length: 255 }),
    barcode: d.varchar({ length: 255 }), // Scannable code
    sku: d.varchar({ length: 255 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
    stockQuantity: d.integer().notNull().default(0),
    lowStockThreshold: d.integer().default(5),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("product_tenant_idx").on(t.tenantId),
    index("product_barcode_idx").on(t.barcode),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  purchaseOrderItems: many(purchaseOrderItems),
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
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatus("status").default("COMPLETED").notNull(),
    paymentMethod: d.varchar({ length: 50 }).default("CASH"),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow().notNull(),
  }),
  (t) => [index("order_tenant_idx").on(t.tenantId)],
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
