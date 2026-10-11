import { z } from "zod";
import { createTRPCRouter, managerProcedure } from "~/server/api/trpc";
import { orders, orderItems, products, categories } from "~/server/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { countsAsSaleSql } from "~/server/orders/sales-filter";

const genAI = process.env.GOOGLE_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    : null;

export const analyticsRouter = createTRPCRouter({
    getKpiStats: managerProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.tenantId;

        // 1. Total Revenue (All Time)
        const [revenueResult] = await ctx.db
            .select({
                total: sql<number>`sum(${orders.totalAmount})`
            })
            .from(orders)
            .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql()));

        // 2. Total Orders (All Time)
        const [ordersResult] = await ctx.db
            .select({
                count: sql<number>`count(*)`
            })
            .from(orders)
            .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql()));

        // 3. Calculate Average Order Value
        const totalRevenue = revenueResult?.total ?? 0;
        const totalOrders = ordersResult?.count ?? 0;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // 4. Gross Profit (simplified: Revenue - Cost of Goods Sold)
        // This requires joining orders -> orderItems -> products to get costPrice
        const [profitResult] = await ctx.db
            .select({
                cost: sql<number>`sum(${products.costPrice} * ${orderItems.quantity})`
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql()));

        const totalCost = profitResult?.cost ?? 0;
        const grossProfit = totalRevenue - totalCost;

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            grossProfit,
        };
    }),

    getSalesByDate: managerProcedure
        .input(z.object({ days: z.number().default(30) }))
        .query(async ({ ctx, input }) => {
            const tenantId = ctx.tenantId;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - input.days);

            // Aggregate sales by date
            const sales = await ctx.db
                .select({
                    date: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`,
                    amount: sql<number>`sum(${orders.totalAmount})`,
                    count: sql<number>`count(*)`
                })
                .from(orders)
                .where(
                    and(
                        eq(orders.tenantId, tenantId),
                        countsAsSaleSql(),
                        gte(orders.createdAt, startDate)
                    )
                )
                .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

            return sales;
        }),

    getTopCategories: managerProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.tenantId;

        const categoriesData = await ctx.db
            .select({
                name: sql<string>`COALESCE(${categories.name}, 'Uncategorized')`,
                value: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})`
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .innerJoin(products, eq(orderItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql()))
            .groupBy(categories.name)
            .orderBy(desc(sql`sum(${orderItems.price} * ${orderItems.quantity})`))
            .limit(5);

        return categoriesData;
    }),

    getAiSummary: managerProcedure.query(async ({ ctx }) => {
        if (!genAI) {
            return {
                text: "AI summaries are not configured. Please set GOOGLE_GEMINI_API_KEY environment variable.",
            };
        }

        const tenantId = ctx.tenantId;

        // Fetch key metrics and tenant settings for the summary
        const results = await Promise.all([
            ctx.db
                .select({
                    totalRevenue: sql<number>`sum(${orders.totalAmount})`,
                    totalOrders: sql<number>`count(*)`,
                })
                .from(orders)
                .where(and(eq(orders.tenantId, tenantId), countsAsSaleSql())),
            ctx.db.query.tenants.findFirst({
                where: (tenants, { eq }) => eq(tenants.id, tenantId),
            }),
        ]);

        const kpiStats = results[0]?.[0];
        const settings = results[1];

        const currency = settings?.currency ?? "$";

        const revenue = kpiStats?.totalRevenue ?? 0;
        const totalOrdersCount = kpiStats?.totalOrders ?? 0;

        // If no data, return a helpful message
        if (totalOrdersCount === 0) {
            return {
                text: "Start making sales to generate AI-powered insights! Once you have transaction data, I'll provide personalized business summaries and recommendations.",
            };
        }

        // Get recent sales trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [recentStats] = await Promise.all([
            ctx.db
                .select({
                    recentRevenue: sql<number>`sum(${orders.totalAmount})`,
                    recentOrders: sql<number>`count(*)`,
                })
                .from(orders)
                .where(
                    and(
                        eq(orders.tenantId, tenantId),
                        countsAsSaleSql(),
                        gte(orders.createdAt, thirtyDaysAgo)
                    )
                ),
        ]);

        const recentRevenue = recentStats?.[0]?.recentRevenue ?? 0;
        const recentOrders = recentStats?.[0]?.recentOrders ?? 0;

        // Prepare prompt for Gemini
        const prompt = `You are a business analyst. Analyze the following sales data and provide a concise, actionable summary (2-3 sentences) with insights:

- Total Revenue: ${currency}${revenue?.toFixed(2)}
- Total Orders: ${totalOrdersCount}
- Average Order Value: ${currency}${totalOrdersCount > 0 ? (revenue / totalOrdersCount).toFixed(2) : "0.00"}
- Last 30 Days Revenue: ${currency}${recentRevenue?.toFixed(2)}
- Last 30 Days Orders: ${recentOrders}

Provide insights about business performance, trends, and any recommendations. Keep it professional and concise.`;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return { text };
        } catch (error) {
            console.error("AI Summary Error:", error);
            return {
                text: "Unable to generate AI summary at this time. Please try again later.",
            };
        }
    })
});

