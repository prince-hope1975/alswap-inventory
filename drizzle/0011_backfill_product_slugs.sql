-- Backfill product slugs, then make the column required.
--
-- `slug` was nullable and `product_tenant_slug_idx` is a unique index, which in
-- Postgres does not constrain NULLs — so any number of slug-less products were
-- allowed. Those rows fell back to their UUID in URLs and in the sitemap, which
-- is a poor canonical and unusable as a stable Merchant Center link.
--
-- The generated slug mirrors createSlug() in src/lib/domain/slug.ts closely
-- enough for existing rows: lowercase, non-alphanumeric runs collapsed to "-",
-- trimmed. Application-generated slugs suffix 6 random hex characters; these
-- suffix 8 characters of the row id, so a backfilled slug cannot collide with
-- an existing one.
UPDATE "alswap-inventory_product"
SET slug = COALESCE(
    NULLIF(
      trim(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'product'
  ) || '-' || substr(id, 1, 8)
WHERE slug IS NULL OR slug = '';
--> statement-breakpoint
ALTER TABLE "alswap-inventory_product" ALTER COLUMN "slug" SET NOT NULL;
