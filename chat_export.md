# Comprehensive Project History & Implementation Details
## Project: Alswap Inventory Stock Management

This document provides a highly detailed record of the implementation work performed on the Alswap Inventory system, including architecture decisions, logic flows, and technical specifications.

---

## 1. Feature: Support for Unknown Product Quantities
**Objective:** Allow products to be stored with an "unknown" stock level (represented as `-1`) to distinguish from actual zero stock, and ensure all financial and reporting calculations handle this correctly.

### Technical Implementation:
- **Database Schema**: The `products` table in `src/server/db/schema.ts` stores `stockQuantity` as an integer. We established the convention that `-1` signifies "Unknown".
- **Backend (TRPC Router)**:
  - Updated `createProduct`, `updateProduct`, and `bulkCreateProducts` validation to allow `-1`.
  - Added logic in `src/server/api/routers/inventory.ts` to skip low-stock threshold validation if quantity is `-1`.
  - Modified `getLowStockProducts` to filter out unknown quantities so they don't trigger false alerts.
- **Financial Calculations (`getDashboardStats`)**:
  - `totalValueConfirmed`: Sum of `price * stockQuantity` only where `stockQuantity >= 0`.
  - `totalValueEstimated`: Sum of `price * stockQuantity` where `-1` is treated as `0`.
- **Frontend UI**:
  - **Product Form**: Added a "Quantity Unknown" checkbox. When checked, it disables the numeric input and sets the value to `-1`.
  - **Bulk Import**: Updated the manual CSV parser to detect empty or blank values in the quantity column and automatically map them to `-1`.

---

## 2. Feature: Multiple Product Image Support
**Objective:** Enable products to have a primary image and an array of additional images for better cataloging.

### Technical Implementation:
- **Schema Modification**: Added a `json` type column `images` to the `products` table to store an array of URLs.
- **Form UI**: Updated `ProductForm` to include a primary `ImageUpload` and a dynamic list of additional image inputs with add/remove functionality.
- **Backend**: Updated procedures to accept `images` array and store it in the new column while maintaining the old `image` column for backward compatibility.

---

## 3. Feature: Bulk Product Import System
**Objective:** Create a robust tool for importing multiple products at once via CSV data paste.

### Technical Implementation:
- **Logic File**: `src/app/inventory/products/new/bulk-import.tsx`.
- **Manual CSV Parser**: Due to library installation constraints, a custom parser was built to handle various header formats (e.g., "Selling Price" vs "Price").
- **Review Interface**: A table that allows editing any field before the final commit to the database.
- **Duplicate Detection Integration**: (See Section 4).

---

## 4. Feature: Duplicate Product Detection & Fuzzy Matching
**Objective:** Prevent data redundancy by identifying similar or identical products during entry.

### Detailed Technical Logic:
- **Utility**: `src/lib/fuzzy-match.ts`.
  - **Algorithm**: Levenshtein Distance.
  - **Similarity Score**: Calculated as `1 - (Distance / MaxLength)`.
  - **Normalization**: All comparisons are case-insensitive and trimmed.

### Individual Import Workflow:
- Integrated a `SimilarProductsPanel` into the `ProductForm`.
- **Fuzzy Search Trigger**: As the user types the product name, a debounced (500ms) query calls `findSimilarProducts` if the length is >= 3.
- **User Action**: The UI displays similar existing products with a "match percentage". A "Use This" button allows the user to pre-populate the entire form with existing data to avoid creating a duplicate or to quickly template a similar item.

### Bulk Import Workflow:
- **Detection Phase**:
  1. **CSV Intra-Check**: Identifies if the same name appears multiple times within the pasted CSV data.
  2. **Database Cross-Check**: Uses the `checkDuplicatesMutation` to query the DB for exact name matches.
- **Resolution UI**:
  - Added a **Status Badge** column: `✓ New`, `⚠️ Duplicate in CSV`, or `⚠️ Exists in DB`.
  - Added an **Action Selector**: Allows the user to choose between `Create New`, `Merge`, or `Skip` for every row.
- **Merging Logic**:
  - `mergeStrategy: "add_stock"`: Updates the existing product's price/cost and increments the current stock by the amount in the CSV.

---

## 5. Feature: Error Handling & System Notifications
**Objective:** Provide immediate, clear feedback for all asynchronous operations.

### Technical Implementation:
- **Custom Toast Utility**: `src/lib/toast.ts`.
  - Created a native implementation to avoid external dependencies.
  - Supports Success, Error, Warning, and Info states with CSS animations.
- **Integration Points**:
  - Added `onSuccess` and `onError` callbacks to all TRPC mutations in `ProductForm` and `BulkImport`.
  - **Detailed Messages**: Error toasts now display specific server-side error messages (e.g., "Failed to merge product: [Error Detail]").
  - **Progress Tracking**: Info toasts inform the user during the parse and import stages of bulk operations.
- **Resilience**: User-added `ErrorBoundary` components around `StatsGrid`, `RecentSales`, and `ProductForm` to ensure that a localized failure doesn't crash the entire dashboard.

---

## 6. Project Architecture Highlights
- **Framework**: Next.js 15 (App Router).
- **API**: TRPC with TanStack Query.
- **Database**: PostgreSQL with Drizzle ORM.
- **Validation**: Zod.
- **Styling**: Vanilla CSS / Tailwind.

---
*Exported on 2025-12-29*
