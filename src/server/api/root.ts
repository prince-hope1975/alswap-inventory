
import { authRouter } from "~/server/api/routers/auth";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { posRouter } from "~/server/api/routers/pos";
import { crmRouter } from "~/server/api/routers/crm";
import { settingsRouter } from "~/server/api/routers/settings";
import { analyticsRouter } from "~/server/api/routers/analytics";
import { userManagementRouter } from "~/server/api/routers/user-management";
import { shopRouter } from "~/server/api/routers/shop";
import { notificationsRouter } from "~/server/api/routers/notifications";
import { ordersRouter } from "~/server/api/routers/orders";
import { reviewsRouter } from "~/server/api/routers/reviews";
import { articlesRouter } from "~/server/api/routers/articles";
import { solarRouter } from "~/server/api/routers/solar";
import { documentsRouter } from "~/server/api/routers/documents";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  inventory: inventoryRouter,
  pos: posRouter,
  crm: crmRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  users: userManagementRouter,
  shop: shopRouter,
  notifications: notificationsRouter,
  orders: ordersRouter,
  reviews: reviewsRouter,
  articles: articlesRouter,
  solar: solarRouter,
  documents: documentsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
