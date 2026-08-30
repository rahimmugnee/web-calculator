# Mugnee Calculator database foundation

## Current transition state

The React calculator still reads its existing JavaScript catalogs and uses the existing shared calculation utilities. PostgreSQL is an additive, server-side foundation in this phase; a database outage cannot change or stop the current calculator. The generated import file is disposable and ignored by Git. The source JavaScript catalogs remain the source of truth until a later, separately tested API migration.

## Connection and setup

PostgreSQL credentials are never placed in React variables or source files. Copy `.env.example` to `.env` and set:

```text
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/quotation_calculator
DATABASE_SSL=false
```

Do not prefix the connection with `REACT_APP_`; Create React App embeds such values in browser code.

```bash
npm install
npm run db:setup
```

`db:setup` runs versioned migrations, exports the current static catalogs, and imports them transactionally. It uses the already-created `quotation_calculator` database and never creates a database. Individual commands are:

```bash
npm run db:migrate
npm run db:catalog:export
npm run db:seed
npm run db:test
```

Both migrations and catalog import are idempotent. Applied migration filenames are recorded in `schema_migrations`; products use stable `source_key` upserts and prices use `(company_id, product_id, price_tier)` upserts.

## Schema and relationships

- `companies`: Mugnee Multiple (`mugnee`, default), Renex (`renex`), and Sasha Corporation (`sasha`). Only one active row can be marked default.
- `products`: shared/master product identity plus common searchable columns. `technical_metadata` JSONB retains category-specific calculator fields without flattening or losing the current data shape.
- `company_product_prices`: one product can have independent company prices. `price_tier` supports LED gold/platinum/diamond and special variants; default-priced products use `default`. Cost and future pricing metadata are optional.
- `calculator_settings`: JSONB configuration per company and calculator type. Formulas remain in the shared JavaScript calculation engine.
- `quotation_settings`: prefix, header/footer, terms, branding, validity, and delivery defaults per company.
- `invoice_settings`: company-specific `template_key`, prefix, and settings; layouts are not assumed to be shared.
- `quotations` / `quotation_items`: quotation header and immutable line snapshots. A nullable product link is retained, but descriptions and actual prices are copied into each item.
- `invoices` / `invoice_items`: equivalent future-safe invoice header and snapshot lines, optionally linked to a quotation.

Foreign keys protect ownership, unique constraints prevent duplicate prices/numbers, lookup indexes cover catalog and document access, and `updated_at` triggers maintain timestamps.

## Static catalog mapping

`scripts/db/export-static-catalog.mjs` reads, without modifying:

- `src/data/component-model-and-price.js` for LED modules, brand/tier prices, controllers, receiving cards, cabinets, and power supplies;
- `src/data/paProducts.js` for PA products;
- `src/data/conferenceProducts.js` for conference products.

LED module brand variants receive distinct master product keys because brand is part of the physical/catalog identity; company is not. Prices are extracted into `company_product_prices`, while the original complete item is retained in JSONB metadata. Current static Mugnee prices are imported for Mugnee only. Renex and Sasha intentionally start without copied Mugnee prices to avoid silently assigning incorrect prices.

Rental calculations currently reuse configuration/formulas rather than a standalone product list. Their technical defaults remain static in `rentalCalc.js`; products they share with LED are already representable in the common catalog.

## Server-side compatibility layer

`server/repositories/catalogRepository.mjs` provides:

- `getCatalog(companyIdOrCode, options)`
- `getProductPrice(companyIdOrCode, productId, priceTier)`
- `getCompanySettings(companyIdOrCode)`

`server/repositories/quotationRepository.mjs` validates monetary inputs and transactionally stores quotation snapshots. These modules are server-only and must be called from a future authenticated API—not imported by React.

## Adding another company

Insert a unique company `code`, add its calculator/quotation/invoice settings, then create only its `company_product_prices` rows for shared product IDs. Do not copy products or calculation engines. Ensure exactly one company remains `is_default = true`.

## Recommended next step

Add an authenticated server API around the repositories and first migrate read-only catalog loading for one calculator behind a static-catalog fallback/feature flag. Compare database output to the static catalog in automated tests before enabling company switching or admin writes. Quotation persistence can then be connected using the existing calculation snapshot as the immutable input.

## Admin management extension

Migration `003_admin_management.sql` adds users, roles, permissions, database-backed sessions, hierarchical categories, reusable brands/category mappings, pricing-tier metadata, customers, and activity logs. Products now have optional category and brand foreign keys while retaining their original string columns and JSONB metadata for compatibility. See `ADMIN_PANEL.md` for authentication, API, company switching, and administration instructions.
