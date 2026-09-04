import { PrismaClient, Product, Warehouse } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // ---- Customers ----------------------------------------------------
  const [alice, bob] = await Promise.all([
    prisma.customer.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        id: '550e8400-e29b-41d4-a716-446655440001',
      },
    }),
    prisma.customer.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        name: 'Bob Nguyen',
        email: 'bob@example.com',
        id: '550e8400-e29b-41d4-a716-446655440000',
      },
    }),
  ]);

  // ---- Products -------------------------------------------------------
  const productDefs = [
    { sku: 'WIDGET-STD', name: 'Standard Widget', priceCents: 1999 },
    { sku: 'WIDGET-PRO', name: 'Pro Widget', priceCents: 4999 },
    { sku: 'GADGET-MINI', name: 'Mini Gadget', priceCents: 999 },
    { sku: 'GADGET-MAX', name: 'Max Gadget', priceCents: 7999 },
    { sku: 'GIZMO-2000', name: 'Gizmo 2000', priceCents: 2999 },
  ];

  const products: Product[] = [];
  for (const def of productDefs) {
    const product = await prisma.product.upsert({
      where: { sku: def.sku },
      update: { name: def.name, priceCents: def.priceCents },
      create: def,
    });
    products.push(product);
  }
  const [widgetStd, widgetPro, gadgetMini, gadgetMax, gizmo] = products;

  // ---- Warehouses (spread across the US) -------------------------------
  // Lat/lng below are the real coordinates of each city, standing in for
  // what a geocoding provider would return when the warehouse was created.
  const warehouseDefs = [
    {
      name: 'Newark Distribution Center',
      addressLine1: '100 Logistics Way',
      city: 'Newark',
      state: 'NJ',
      postalCode: '07102',
      country: 'US',
      latitude: 40.7357,
      longitude: -74.1724,
    },
    {
      name: 'Atlanta Fulfillment Center',
      addressLine1: '200 Peachtree Industrial Blvd',
      city: 'Atlanta',
      state: 'GA',
      postalCode: '30301',
      country: 'US',
      latitude: 33.749,
      longitude: -84.388,
    },
    {
      name: 'Dallas Fulfillment Center',
      addressLine1: '300 Commerce St',
      city: 'Dallas',
      state: 'TX',
      postalCode: '75201',
      country: 'US',
      latitude: 32.7767,
      longitude: -96.797,
    },
    {
      name: 'Reno Distribution Center',
      addressLine1: '400 Warehouse Dr',
      city: 'Reno',
      state: 'NV',
      postalCode: '89501',
      country: 'US',
      latitude: 39.5296,
      longitude: -119.8138,
    },
  ];

  const warehouses: Warehouse[] = [];
  for (const def of warehouseDefs) {
    const existing = await prisma.warehouse.findFirst({
      where: { name: def.name },
    });
    const warehouse = existing
      ? await prisma.warehouse.update({ where: { id: existing.id }, data: def })
      : await prisma.warehouse.create({ data: def });
    warehouses.push(warehouse);
  }
  const [newark, atlanta, dallas, reno] = warehouses;

  // ---- Inventory --------------------------------------------------------
  // Deliberately uneven so that "which single warehouse can fill this
  // order" and "which one is closest" both have interesting answers:
  //  - Newark: broad stock of everything.
  //  - Atlanta: everything except Max Gadget (out of stock).
  //  - Dallas: only Widgets.
  //  - Reno: everything, small quantities.
  const inventory: Array<{
    warehouseId: string;
    productId: string;
    quantity: number;
  }> = [
    // Newark - well stocked
    { warehouseId: newark.id, productId: widgetStd.id, quantity: 200 },
    { warehouseId: newark.id, productId: widgetPro.id, quantity: 150 },
    { warehouseId: newark.id, productId: gadgetMini.id, quantity: 300 },
    { warehouseId: newark.id, productId: gadgetMax.id, quantity: 80 },
    { warehouseId: newark.id, productId: gizmo.id, quantity: 120 },

    // Atlanta - stocked except Max Gadget
    { warehouseId: atlanta.id, productId: widgetStd.id, quantity: 100 },
    { warehouseId: atlanta.id, productId: widgetPro.id, quantity: 60 },
    { warehouseId: atlanta.id, productId: gadgetMini.id, quantity: 90 },
    { warehouseId: atlanta.id, productId: gizmo.id, quantity: 40 },

    // Dallas - widgets only
    { warehouseId: dallas.id, productId: widgetStd.id, quantity: 500 },
    { warehouseId: dallas.id, productId: widgetPro.id, quantity: 500 },

    // Reno - a bit of everything, low quantity
    { warehouseId: reno.id, productId: widgetStd.id, quantity: 10 },
    { warehouseId: reno.id, productId: widgetPro.id, quantity: 10 },
    { warehouseId: reno.id, productId: gadgetMini.id, quantity: 10 },
    { warehouseId: reno.id, productId: gadgetMax.id, quantity: 5 },
    { warehouseId: reno.id, productId: gizmo.id, quantity: 5 },
  ];

  for (const row of inventory) {
    await prisma.warehouseInventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: row.warehouseId,
          productId: row.productId,
        },
      },
      update: { quantity: row.quantity },
      create: row,
    });
  }

  console.log('Seed complete.');
  console.log({
    customers: { alice: alice.id, bob: bob.id },
    products: Object.fromEntries(products.map((p) => [p.sku, p.id])),
    warehouses: Object.fromEntries(warehouses.map((w) => [w.name, w.id])),
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
