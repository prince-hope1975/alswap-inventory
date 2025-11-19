
import { authRouter } from "~/server/api/routers/auth";
import { inventoryRouter } from "~/server/api/routers/inventory";
import { posRouter } from "~/server/api/routers/pos";
import { crmRouter } from "~/server/api/routers/crm";
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
