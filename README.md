# Canals Order Management API (NestJS)

A minimal, production-shaped order management API for the Canals backend
assessment, built with **NestJS** + TypeScript + PostgreSQL (via Prisma).

This is a straight NestJS port of the same design as the plain-Express
version: same data model, same business logic, same mocked external
services — just organized into Nest modules/providers/DTOs instead of
hand-rolled Express routes.

## What it does

`POST /order` creates an order for a customer:

1. Looks up the customer and the requested products.
2. Geocodes the shipping address (mocked — see below).
3. Finds every warehouse that has enough stock of **every** requested
   product, and picks the one closest to the shipping address.
4. If no single warehouse can fill the whole order, the request fails
   (`422`) rather than splitting the order across warehouses.
5. Charges a credit card for the order total via a mocked payment gateway.
6. On a successful charge: decrements inventory at the chosen warehouse and
   marks the order `PAID`.
   On a decline: the order is kept as a record with status
   `PAYMENT_FAILED`, and no inventory is touched.

## Stack & why

- **NestJS** — structures the app into modules/providers with dependency
  injection, which keeps the mocked geocoding/payment services and the
  warehouse-selection logic cleanly separated and easy to swap for real
  integrations later.
- **PostgreSQL + Prisma** — a real relational database, since orders,
  payments, and inventory decrements need transactional guarantees. Prisma
  gives type-safe queries and a migration workflow without much ceremony.
- **class-validator / class-transformer** — Nest's standard DTO validation
  approach; a global `ValidationPipe` validates and transforms every
  request body at the edge of the system.

## Project structure

```
construction-materials/
  docker-compose.yml             PostgreSQL and API containers
  dockerfile                     Multi-stage API image build
  package.json                   Scripts and dependencies
  prisma.config.ts               Prisma schema, migrations, and seed configuration
  prisma/
    schema.prisma                Database models and enums
    seed.ts                      Seed data for customers, products, warehouses, and inventory
    migrations/                  Versioned database migrations
  src/
    main.ts                      Nest bootstrap, validation, and Swagger setup
    app.module.ts                 Root module
    common/                       Shared exceptions and geographic utilities
    geocoding/                    Mock geocoding provider
    payment/                      Mock payment gateway
    prisma/                       Injectable Prisma client and module
    warehouses/                   Warehouse-selection service and interfaces
    orders/
      order.controller.ts         POST /order
      order.service.ts             Order creation orchestration
      order.module.ts          
      dto/                         Request and response DTOs
      helpers/                     Request sanitizing and order serialization
      interface/                   Order-related TypeScript interfaces
      services/                    Validation, pricing, fulfillment, and persistence
  README.md                       Project documentation
```

## Data model

See `prisma/schema.prisma` for the full schema and comments. Summary:

- `Customer`, `Product`, `Warehouse`, `WarehouseInventory` — reference data.
  There's no API to manage these per the assessment's scope; they're seeded
  instead (see below).
- `Order` / `OrderItem` — an order snapshots the shipping address and each
  item's unit price at the time of purchase, so it stays an accurate
  historical record even if a customer's address or a product's price
  changes later.
- `Payment` — one row per order in this simplified version, recording what
  the (mocked) payment gateway returned. Only the card's last 4 digits are
  ever persisted, matching how a real integration would work (see
  `src/payment/payment.service.ts`).
- Money is stored as integer cents throughout to avoid floating-point
  rounding issues. The submitted `priceCents` is used to calculate the order
  total and is snapshotted on the order item; the product's database price is
  not used to override the request value.

## Mocked external services

Both are Nest providers behind a small interface, injected via the
constructor, so they're a drop-in swap for a real integration later:

- **Geocoding** (`geocoding/geocoding.service.ts`): a real implementation
  would call Google Maps / Mapbox / SmartyStreets (e.g. via
  `@nestjs/axios`'s `HttpService`). The mock derives a deterministic
  lat/lng from a hash of the address text (kept inside the continental US
  bounding box), so the same address always geocodes the same way and the
  API's behavior stays predictable to test against, while different
  addresses land in different places.
- **Payment** (`payment/payment.service.ts`): a real implementation would
  call Stripe/Braintree/Adyen and would never see a raw card number (the
  frontend would tokenize it directly with the provider). The mock accepts
  a card number, amount, and description, and declines any card number
  ending in `0002` (configurable via `MOCK_PAYMENT_DECLINE_SUFFIXES`,
  read through Nest's `ConfigService`), succeeding otherwise. Simulated
  network latency is included on both mocks.

## Design decisions worth calling out

- **Order creation is not atomic with the payment call** (it can't be — the
  payment call is a network round trip to a third party). Instead: the
  order is written as `PENDING` first, then the charge is attempted, then
  the order is finalized to `PAID` or `PAYMENT_FAILED` inside a Prisma
  interactive transaction. This means an order record always exists for a
  payment attempt (useful for support/audit), and inventory is only ever
  decremented after money has actually moved — never before.
- **Single-warehouse fulfillment**: if no one warehouse has all requested
  products in sufficient quantity, the order is rejected outright (`422`,
  via Nest's `UnprocessableEntityException`) rather than being split across
  multiple shipments, per the spec.
- **"Closest" warehouse**: computed with the haversine formula over
  lat/lng — good enough for "which warehouse is closest," no need for a
  routing API's road distance here.
- **Concurrency / scale are explicitly out of scope** per the assessment.
  Warehouse lookup and inventory checks are done with a simple loop of
  single queries rather than a batched query, and there's no row locking
  around the inventory decrement. In a real high-traffic system I'd guard
  the decrement with a conditional update (`WHERE quantity >= :qty`,
  re-checking the affected row count) or a `SELECT ... FOR UPDATE`, and
  retry warehouse selection if the race was lost.
- **Validation**: a global `ValidationPipe` (`whitelist` +
  `forbidNonWhitelisted` + `transform`) validates every request body
  against `CreateOrderDto` before it reaches the controller — UUIDs,
  positive integer quantities, no duplicate product entries in one order,
  required address fields, and a plausible card number shape.
- **402 for a decline**: Nest doesn't ship a `PaymentRequiredException`, so
  there's a small custom one in `common/exceptions.ts`; everything else
  (`NotFoundException`, `UnprocessableEntityException`) uses Nest's
  built-ins directly.

## Request and runtime behavior

- `customerId` must be a UUID v4. Items require a known, case-sensitive SKU,
  a positive integer quantity, and a positive integer `priceCents`. Duplicate
  SKUs and unknown request fields are rejected.
- `shippingAddress.line2` is accepted for input validation but is not stored
  or returned by the current persistence and serialization code.
- The API currently exposes only `POST /order`; there are no read, product,
  customer, warehouse, or health endpoints. Swagger UI is available at
  `/api`.
- `400` is used for DTO validation, `422` when fulfillment cannot find one
  warehouse for the complete order, and `402` for a declined payment. The
  declined response contains the created order in `body.order` with status
  `PAYMENT_FAILED`; inventory is unchanged.
- Persistence and payment infrastructure failures generally return `503`.
  Some downstream validation and fulfillment failures are normalized by the
  current services, so their error message may be generic.
- Helmet, wildcard CORS, CSRF middleware, and a rate limit of 100 requests per
  IP per 15 minutes are enabled in `src/main.ts`. CSRF and deployment-level
  origin policy should be reviewed before exposing the API publicly.

## Run everything with Docker

The Compose file starts PostgreSQL and builds the NestJS API image. The API
container applies the Prisma schema before starting the server.

The checked-in Compose configuration currently has a credential mismatch:
PostgreSQL is initialized with user `postgres` and password `1234`, while the
API container is configured to connect as `postgres` with password `canals`. The
full-stack command below needs that `DATABASE_URL` corrected in
`docker-compose.yml` (or the database credentials changed) before it can
connect successfully. The local workflow above, which uses `.env.example`, is
the working path with the current files.


```bash
# Copy .env.example
cp .env.example .env
# Build the API image and start both services
docker compose up -d 

```

The API is then available at `http://localhost:3000`, and Swagger is available
at `http://localhost:3000/api`. To follow the logs or stop the services:

```bash
docker compose logs -f api
docker compose down
```

The database data is stored in the `canals_pg_data` Docker volume. To remove
the containers and database volume and start with an empty database:

```bash
docker compose down -v
```

### Seeding the database

`prisma/seed.ts` is idempotent: customers and products use `upsert`, and
warehouse inventory is updated or created with `upsert`. The docker compose already pushes the seed to the database

The script creates or updates:

- Customers: Alice Johnson and Bob Nguyen.
- Products: `WIDGET-STD`, `WIDGET-PRO`, `GADGET-MINI`, `GADGET-MAX`, and `GIZMO-2000`.
- Warehouses: Newark, Atlanta, Dallas, and Reno, with deliberately uneven inventory.

It prints the generated customer, product, and warehouse IDs at the end. Use
those IDs when creating orders.

The seed script inserts the following values. IDs for products, warehouses,
inventory rows, and timestamps are generated by Prisma. Inventory references
the warehouse by `warehouseName` and the product by `productSku` below so the
relationships are easy to understand:

```json
{
  "customers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Alice Johnson",
      "email": "alice@example.com"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Bob Nguyen",
      "email": "bob@example.com"
    }
  ],
  "products": [
    { "sku": "WIDGET-STD", "name": "Standard Widget", "priceCents": 1999 },
    { "sku": "WIDGET-PRO", "name": "Pro Widget", "priceCents": 4999 },
    { "sku": "GADGET-MINI", "name": "Mini Gadget", "priceCents": 999 },
    { "sku": "GADGET-MAX", "name": "Max Gadget", "priceCents": 7999 },
    { "sku": "GIZMO-2000", "name": "Gizmo 2000", "priceCents": 2999 }
  ],
  "warehouses": [
    {
      "name": "Newark Distribution Center",
      "addressLine1": "100 Logistics Way",
      "city": "Newark",
      "state": "NJ",
      "postalCode": "07102",
      "country": "US",
      "latitude": 40.7357,
      "longitude": -74.1724
    },
    {
      "name": "Atlanta Fulfillment Center",
      "addressLine1": "200 Peachtree Industrial Blvd",
      "city": "Atlanta",
      "state": "GA",
      "postalCode": "30301",
      "country": "US",
      "latitude": 33.749,
      "longitude": -84.388
    },
    {
      "name": "Dallas Fulfillment Center",
      "addressLine1": "300 Commerce St",
      "city": "Dallas",
      "state": "TX",
      "postalCode": "75201",
      "country": "US",
      "latitude": 32.7767,
      "longitude": -96.797
    },
    {
      "name": "Reno Distribution Center",
      "addressLine1": "400 Warehouse Dr",
      "city": "Reno",
      "state": "NV",
      "postalCode": "89501",
      "country": "US",
      "latitude": 39.5296,
      "longitude": -119.8138
    }
  ],
  "inventory": [
    { "warehouseName": "Newark Distribution Center", "productSku": "WIDGET-STD", "quantity": 200 },
    { "warehouseName": "Newark Distribution Center", "productSku": "WIDGET-PRO", "quantity": 150 },
    { "warehouseName": "Newark Distribution Center", "productSku": "GADGET-MINI", "quantity": 300 },
    { "warehouseName": "Newark Distribution Center", "productSku": "GADGET-MAX", "quantity": 80 },
    { "warehouseName": "Newark Distribution Center", "productSku": "GIZMO-2000", "quantity": 120 },
    { "warehouseName": "Atlanta Fulfillment Center", "productSku": "WIDGET-STD", "quantity": 100 },
    { "warehouseName": "Atlanta Fulfillment Center", "productSku": "WIDGET-PRO", "quantity": 60 },
    { "warehouseName": "Atlanta Fulfillment Center", "productSku": "GADGET-MINI", "quantity": 90 },
    { "warehouseName": "Atlanta Fulfillment Center", "productSku": "GIZMO-2000", "quantity": 40 },
    { "warehouseName": "Dallas Fulfillment Center", "productSku": "WIDGET-STD", "quantity": 500 },
    { "warehouseName": "Dallas Fulfillment Center", "productSku": "WIDGET-PRO", "quantity": 500 },
    { "warehouseName": "Reno Distribution Center", "productSku": "WIDGET-STD", "quantity": 10 },
    { "warehouseName": "Reno Distribution Center", "productSku": "WIDGET-PRO", "quantity": 10 },
    { "warehouseName": "Reno Distribution Center", "productSku": "GADGET-MINI", "quantity": 10 },
    { "warehouseName": "Reno Distribution Center", "productSku": "GADGET-MAX", "quantity": 5 },
    { "warehouseName": "Reno Distribution Center", "productSku": "GIZMO-2000", "quantity": 5 }
  ]
}
```

Use the fixed customer IDs and product SKUs in requests below. Run the seed
first to obtain the generated product and warehouse IDs printed in the
terminal, if you need to inspect the database directly.

## API

### `POST /order`

**Request body:**

```json
{
  "customerId": "<customer uuid>",
  "shippingAddress": {
    "line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "items": [{ "sku": "WIDGET-STD", "quantity": 2, "priceCents": 1999 }],
  "payment": {
    "creditCardNumber": "4242424242424242"
  }
}
```

**Success — `201 Created`:**

```json
{
  "id": "...",
  "status": "PAID",
  "customerId": "...",
  "warehouseId": "...",
  "shippingAddress": { "...": "...", "latitude": 30.27, "longitude": -97.74 },
  "items": [{ "productId": "...", "quantity": 2, "priceCents": 1999 }],
  "totalAmountCents": 3998,
  "payment": { "status": "SUCCEEDED", "externalPaymentId": "pay_..." },
  "createdAt": "..."
}
```

**Error responses:**

| Status | When                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| `400`  | Request body fails validation (bad UUID, missing field, non-positive quantity, unexpected extra field, etc.) |
| `404`  | `customerId` or a `productId` doesn't exist                                                                  |
| `422`  | No single warehouse has enough stock of every requested item                                                 |
| `402`  | Payment was declined — response body includes the created order (`status: PAYMENT_FAILED`)                   |
| `503`  | Payment or persistence infrastructure failure                                                                  |

### Example: happy path

```bash
curl -s -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<alice id>",
    "shippingAddress": {
      "line1": "123 Main St", "city": "Austin", "state": "TX",
      "postalCode": "78701", "country": "US"
    },
    "items": [{ "sku": "WIDGET-STD", "quantity": 2, "priceCents": 1999 }],
    "payment": { "creditCardNumber": "4242424242424242" }
  }' | jq
```

### Example: declined payment

Use a card number ending in `0002` to see the decline path:

```bash
curl -s -X POST http://localhost:3000/order \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "<alice id>",
    "shippingAddress": {
      "line1": "123 Main St", "city": "Austin", "state": "TX",
      "postalCode": "78701", "country": "US"
    },
    "items": [{ "sku": "WIDGET-STD", "quantity": 1, "priceCents": 1999 }],
    "payment": { "creditCardNumber": "4000000000000002" }
  }' | jq
```

### Example: unfulfillable order

Dallas only stocks widgets, Atlanta doesn't stock Max Gadget, etc. Request
a mix no single warehouse carries (e.g. a large quantity of Max Gadget) to
see the `422` response.
