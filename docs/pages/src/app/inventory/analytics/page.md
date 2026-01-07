# Analytics Page
**Path**: `src/app/inventory/analytics/page.tsx`

## Purpose
Provides business insights, sales trends, and key performance indicators (KPIs).

## Features
*   **KPI Cards**: Total Revenue, Total Orders, Average Order Value, Gross Profit.
*   **Charts**: 
    *   Sales Trend (BarChart - Recharts).
    *   Top Categories (PieChart - Recharts).
*   **AI Summary**: Displays AI-generated business insights.
*   **Exports**: Export sales data to PDF and Excel (`exportToPDF`, `exportToExcel`).
*   **Interactive**: Tooltips on charts, dark mode support.

## Dependencies
*   `recharts`: Charting library.
*   `~/lib/export-utils`: Export functionality.
*   `~/hooks/use-tenant-settings`: Currency formatting.
*   `~/trpc/react`: `api` (analytics router).
