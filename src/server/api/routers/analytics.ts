import { z } from "zod";
import { createTRPCRouter, tenantProcedure } from "~/server/api/trpc";
import { orders, orderItems, products, categories } from "~/server/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = process.env.GOOGLE_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
    : null;

export const analyticsRouter = createTRPCRouter({
    getKpiStats: tenantProcedure.query(async ({ ctx }) => {
        const tenantId = ctx.tenantId;
        
        // 1. Total Revenue (All Time)
        const [revenueResult] = await ctx.db
            .select({
                total: sql<number>`sum(${orders.totalAmount})`
            })
            .from(orders)
            .where(eq(orders.tenantId, tenantId));

        // 2. Total Orders (All Time)
        const [ordersResult] = await ctx.db
            .select({
                count: sql<number>`count(*)`
            })
            .from(orders)
            .where(eq(orders.tenantId, tenantId));

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
            .where(eq(orders.tenantId, tenantId));
        
        const totalCost = profitResult?.cost ?? 0;
        const grossProfit = totalRevenue - totalCost;

        return {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            grossProfit,
        };
    }),

    getSalesByDate: tenantProcedure
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
                        gte(orders.createdAt, startDate)
                    )
                )
                .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`)
                .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`);

            return sales;
        }),

    getTopCategories: tenantProcedure.query(async ({ ctx }) => {
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
            .where(eq(orders.tenantId, tenantId))
            .groupBy(categories.name)
            .orderBy(desc(sql`sum(${orderItems.price} * ${orderItems.quantity})`))
            .limit(5);

        return categoriesData;
    }),

    getAiSummary: tenantProcedure.query(async ({ ctx }) => {
        if (!genAI) {
            return {
                text: "AI summaries are not configured. Please set GOOGLE_GEMINI_API_KEY environment variable.",
            };
        }

        const tenantId = ctx.tenantId;
        
        // Fetch key metrics for the summary
        const [kpiStats] = await Promise.all([
            ctx.db
                .select({
                    totalRevenue: sql<number>`sum(${orders.totalAmount})`,
                    totalOrders: sql<number>`count(*)`,
                })
                .from(orders)
                .where(eq(orders.tenantId, tenantId)),
        ]);

        const revenue = kpiStats?.[0]?.totalRevenue ?? 0;
        const orders = kpiStats?.[0]?.totalOrders ?? 0;

        // If no data, return a helpful message
        if (orders === 0) {
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
                        gte(orders.createdAt, thirtyDaysAgo)
                    )
                ),
        ]);

        const recentRevenue = recentStats?.[0]?.recentRevenue ?? 0;
        const recentOrders = recentStats?.[0]?.recentOrders ?? 0;

        // Prepare prompt for Gemini
        const prompt = `You are a business analyst. Analyze the following sales data and provide a concise, actionable summary (2-3 sentences) with insights:

- Total Revenue: $${revenue.toFixed(2)}
- Total Orders: ${orders}
- Average Order Value: $${orders > 0 ? (revenue / orders).toFixed(2) : "0.00"}
- Last 30 Days Revenue: $${recentRevenue.toFixed(2)}
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

