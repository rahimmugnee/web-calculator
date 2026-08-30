# Calculator Admin Panel

## Setup and login

The admin is mounted at `/admin/login`; the existing calculator remains at `/`.

1. Copy `.env.example` to `.env` and set the real PostgreSQL password.
2. Run `npm install`.
3. Run `npm run db:setup` to apply migrations, import the static catalogs, seed category/brand mappings, and create the development administrator.
4. Run `npm run api:start` in one terminal and `npm start` in another.
5. Open `http://localhost:3000/admin/login`.

Development login:

```text
Username: admin
Password: Admin@2026
Role: Super Admin
```

Change this password after first login. `ADMIN_SEED_PASSWORD` controls the first password only; rerunning the idempotent seed does not overwrite an existing administrator password.

## Environment variables

- `DATABASE_URL`: server-only PostgreSQL connection string.
- `DATABASE_SSL`: set `true` only when SSL is required.
- `API_PORT`: API port, default `3001`.
- `APP_ORIGIN`: browser origin allowed to send credentialed API requests, default `http://localhost:3000`.
- `ADMIN_SEED_PASSWORD`: initial development password used only if the admin does not exist.
- `AUTH_SESSION_HOURS`: normal session lifetime.
- `AUTH_REMEMBER_DAYS`: explicit remember-me lifetime.
- `NODE_ENV`: use `production` to enable secure cookies and serve the production build.
- `REACT_APP_ADMIN_API_URL`: optional compile-time API URL override. It contains no secret.

## Authentication and authorization

Passwords use Node `scrypt` with a random salt. The database stores only the formatted hash. Login creates a random opaque session; PostgreSQL stores only its SHA-256 hash. The browser receives an HttpOnly, SameSite session cookie plus a CSRF cookie. All admin writes require an authenticated session, a matching CSRF header, and a server-side permission check.

Roles seeded are Super Admin, Admin, Sales, Accounts, and Viewer. Permissions cover companies, categories, brands, products, prices, calculator settings, quotations, invoices, templates, users, and activity logs. Important writes, login, logout, bulk price changes, and password resets are audited without passwords or secrets.

## Company switching and pricing

The header company selector defaults to Mugnee Multiple and stores only the selected company ID in session storage. Products, categories, brands, and calculator formulas are shared. Prices, calculator settings, quotation settings, invoice settings, sales records, and customers are filtered by the selected company.

Company price editing writes to `company_product_prices`. A shared product is never copied for Mugnee, Renex, or Sasha. Bulk copy uses `ON CONFLICT DO NOTHING`, so existing destination prices are not overwritten. Percentage and copy operations require a preview followed by explicit confirmation.

## Catalog hierarchy

The database relationship is:

```text
Calculator/System → Category → Brand → Product/Model
```

`categories.parent_id` creates the system/category tree. A single `brands` row can be associated with many categories through `category_brands`. Imported products receive `category_id` and `brand_id` without changing their stable `source_key`.

PA and conference child categories are derived from actual `componentType` values in their static catalogs. LED mappings distinguish modules, controllers/video processors, receiving cards, power supplies, cabinets, and accessories.

Rental LED categories have `uses_brand=false`. The API clears/omits `brand_id` for products in those categories, and the admin removes brand cards, filters, fields, and table columns where category context is Rental LED.

## Product and settings management

Product forms retain ordinary searchable fields while preserving all category-specific fields in `technical_metadata` JSONB. Categories also provide JSONB specification schemas/settings. Calculator settings remain per company and calculator type; the mathematical calculation utilities are unchanged.

Quotation and invoice settings use company-specific records and template keys. Admin template pages edit structured JSON and do not attempt a drag-and-drop designer or replace the current Mugnee PDF components.

## API overview

Authentication:

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

Authenticated administration is under `/api/admin`:

- dashboard and companies
- categories and brands
- products/models
- company prices, tiers, bulk preview/apply
- calculator and template settings
- quotations and invoices
- customers
- users and roles
- activity logs

React never connects directly to PostgreSQL.

## Safe migration strategy

The existing LED, rental, PA, and conference JavaScript catalogs remain active for the calculator. Admin/database reads have not replaced calculator reads. The existing preview, invoice, terms, and PDF components are unchanged. A later calculator-data migration should remain behind a feature flag with static fallback and output-comparison tests.

## Useful commands

```bash
npm run db:migrate
npm run db:catalog:export
npm run db:seed
npm run db:test
npm run api:test
npm run api:start
npm start
npm test -- --watchAll=false
npm run build
```
