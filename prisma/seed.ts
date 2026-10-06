/**
 * Idempotent development seed: safe to run repeatedly (`npm run seed`).
 *
 * Creates the platform settings, category tree, brands, demo accounts
 * (admin / seller / customer), an approved shop, and a handful of products.
 *
 * Demo credentials (override with env vars):
 *   SEED_ADMIN_EMAIL / SEED_SELLER_EMAIL / SEED_CUSTOMER_EMAIL / SEED_PASSWORD
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? "admin@nexusmarket.local").toLowerCase();
const SELLER_EMAIL = (process.env.SEED_SELLER_EMAIL ?? "seller@nexusmarket.local").toLowerCase();
const CUSTOMER_EMAIL = (process.env.SEED_CUSTOMER_EMAIL ?? "customer@nexusmarket.local").toLowerCase();
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

const PLACEHOLDER_IMAGE = "/images/products/placeholder.svg";

const CATEGORY_TREE = [
  {
    name: "Electronics",
    slug: "electronics",
    position: 0,
    children: [
      { name: "Phones & Tablets", slug: "phones-tablets" },
      { name: "Laptops & Computers", slug: "laptops-computers" },
      { name: "Audio & Headphones", slug: "audio-headphones" },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    position: 1,
    children: [
      { name: "Men", slug: "fashion-men" },
      { name: "Women", slug: "fashion-women" },
      { name: "Accessories", slug: "fashion-accessories" },
    ],
  },
  {
    name: "Home & Living",
    slug: "home-living",
    position: 2,
    children: [],
  },
  {
    name: "Beauty & Health",
    slug: "beauty-health",
    position: 3,
    children: [],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    position: 4,
    children: [],
  },
];

const BRANDS = [
  { name: "Nexus Basics", slug: "nexus-basics" },
  { name: "Aurora", slug: "aurora" },
  { name: "Volt", slug: "volt" },
  { name: "Terra", slug: "terra" },
  { name: "Lumen", slug: "lumen" },
];

const PLATFORM_SETTINGS = {
  currency: "PKR",
  // Commission in basis points (1000 = 10%). Overridable per product/category/seller.
  defaultCommissionBps: 1000,
  codEnabled: true,
  onlinePaymentsEnabled: true,
  // Tax in basis points (0 = none). Reserved for future tax rules.
  taxBps: 0,
  // Flat delivery fee charged per seller order (minor units), free above threshold.
  shippingPerSeller: 20000,
  freeShippingOver: 3000000,
  // Minimum payout request amount (minor units).
  minPayoutRequest: 500000,
} as const;

async function seedSettings() {
  await prisma.platformSetting.upsert({
    where: { key: "platform" },
    update: { value: PLATFORM_SETTINGS },
    create: {
      key: "platform",
      value: PLATFORM_SETTINGS,
      description:
        "Global platform defaults (commission, currency, payments, shipping, payouts).",
    },
  });
}

async function seedCategories() {
  const bySlug = new Map<string, string>();

  for (const top of CATEGORY_TREE) {
    const parent = await prisma.category.upsert({
      where: { slug: top.slug },
      update: { position: top.position },
      create: { name: top.name, slug: top.slug, position: top.position },
    });
    bySlug.set(top.slug, parent.id);

    for (const [index, child] of top.children.entries()) {
      const row = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { parentId: parent.id, position: index },
        create: { name: child.name, slug: child.slug, parentId: parent.id, position: index },
      });
      bySlug.set(child.slug, row.id);
    }
  }

  return bySlug;
}

async function seedBrands() {
  const bySlug = new Map<string, string>();
  for (const brand of BRANDS) {
    const row = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: brand,
    });
    bySlug.set(brand.slug, row.id);
  }
  return bySlug;
}

async function upsertUser(email: string, name: string, role: "SUPER_ADMIN" | "SELLER" | "CUSTOMER") {
  const passwordHash = await hash(SEED_PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, name, passwordHash, role, emailVerified: true },
  });
}

type CategoryMap = Map<string, string>;
type BrandMap = Map<string, string>;

async function seedProducts(sellerId: string, shopId: string, categories: CategoryMap, brands: BrandMap) {
  const products = [
    {
      name: "Aurora Wireless Headphones",
      slug: "aurora-wireless-headphones",
      description:
        "Over-ear wireless headphones with active noise cancellation, 40-hour battery life, and soft memory-foam earcups.",
      price: 1299900,
      salePrice: 1099900,
      sku: "AUR-HP-001",
      categorySlug: "audio-headphones",
      brandSlug: "volt",
      quantity: 40,
      variants: [
        { name: "Black", sku: "AUR-HP-001-BLK", options: { color: "Black" } },
        { name: "Silver", sku: "AUR-HP-001-SLV", options: { color: "Silver" } },
      ],
    },
    {
      name: "Nexus Everyday Backpack",
      slug: "nexus-everyday-backpack",
      description:
        "Water-resistant 25L backpack with a padded 15\" laptop sleeve, quick-access pockets, and a breathable back panel.",
      price: 459900,
      sku: "NEX-BP-025",
      categorySlug: "fashion-accessories",
      brandSlug: "nexus-basics",
      quantity: 25,
      variants: [
        { name: "20L", sku: "NEX-BP-020", options: { capacity: "20L" } },
        { name: "25L", sku: "NEX-BP-025B", options: { capacity: "25L" } },
      ],
    },
    {
      name: "Terra Ceramic Mug Set",
      slug: "terra-ceramic-mug-set",
      description: "Set of four 350ml stoneware mugs with a speckled glaze. Dishwasher and microwave safe.",
      price: 249900,
      sku: "TER-MG-004",
      categorySlug: "home-living",
      brandSlug: "terra",
      quantity: 60,
      variants: [],
    },
    {
      name: "Volt 65W USB-C Charger",
      slug: "volt-65w-usb-c-charger",
      description: "GaN fast charger with a single 65W USB-C PD port. Foldable prongs, travel friendly.",
      price: 549900,
      salePrice: 499900,
      sku: "VLT-CH-065",
      categorySlug: "phones-tablets",
      brandSlug: "volt",
      quantity: 100,
      variants: [],
    },
    {
      name: "Aurora Non-Slip Yoga Mat",
      slug: "aurora-non-slip-yoga-mat",
      description: "6mm eco-friendly TPE yoga mat with alignment lines and a carrying strap.",
      price: 349900,
      sku: "AUR-YM-006",
      categorySlug: "sports-outdoors",
      brandSlug: "aurora",
      quantity: 30,
      variants: [],
    },
    {
      name: "Lumen Vitamin C Face Serum",
      slug: "lumen-vitamin-c-face-serum",
      description: "Brightening 10% vitamin C serum with hyaluronic acid. 30ml dropper bottle.",
      price: 289900,
      sku: "LUM-SR-030",
      categorySlug: "beauty-health",
      brandSlug: "lumen",
      quantity: 45,
      variants: [],
    },
  ];

  for (const product of products) {
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        price: product.price,
        salePrice: product.salePrice ?? null,
        effectivePrice: product.salePrice ?? product.price,
        status: "ACTIVE",
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice ?? null,
        effectivePrice: product.salePrice ?? product.price,
        sku: product.sku,
        status: "ACTIVE",
        sellerId,
        shopId,
        categoryId: categories.get(product.categorySlug) ?? null,
        brandId: brands.get(product.brandSlug) ?? null,
        publishedAt: new Date(),
        images: {
          create: [{ url: PLACEHOLDER_IMAGE, alt: product.name, position: 0 }],
        },
        variants: {
          create: product.variants.map((variant) => ({
            name: variant.name,
            sku: variant.sku,
            options: variant.options,
          })),
        },
        inventory: {
          create: { quantity: product.quantity, lowStockThreshold: 5 },
        },
      },
      include: { images: true },
    });

    if (row.images.length === 0) {
      await prisma.productImage.create({
        data: { productId: row.id, url: PLACEHOLDER_IMAGE, alt: product.name, position: 0 },
      });
    }
  }

  console.log(`  ${products.length} products`);
}

async function main() {
  console.log("Seeding database…");

  await seedSettings();
  console.log("  platform settings");

  const categories = await seedCategories();
  console.log(`  ${categories.size} categories`);

  const brands = await seedBrands();
  console.log(`  ${brands.size} brands`);

  const admin = await upsertUser(ADMIN_EMAIL, "Platform Admin", "SUPER_ADMIN");
  const seller = await upsertUser(SELLER_EMAIL, "Sam Seller", "SELLER");
  await upsertUser(CUSTOMER_EMAIL, "Cara Customer", "CUSTOMER");
  console.log(`  accounts: ${admin.email}, ${seller.email}, ${CUSTOMER_EMAIL}`);
  console.log(`  password: ${SEED_PASSWORD} (SEED_PASSWORD)`);

  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    update: { applicationStatus: "APPROVED" },
    create: {
      userId: seller.id,
      applicationStatus: "APPROVED",
      businessName: "Aurora Traders",
      businessType: "sole_proprietor",
      reviewedAt: new Date(),
    },
  });

  const shop = await prisma.shop.upsert({
    where: { sellerId: sellerProfile.id },
    update: {},
    create: {
      sellerId: sellerProfile.id,
      name: "Aurora Store",
      slug: "aurora-store",
      tagline: "Everyday tech & living, curated",
      description: "Demo shop created by the seed script.",
      status: "ACTIVE",
      contactEmail: SELLER_EMAIL,
    },
  });
  console.log(`  shop: ${shop.name}`);

  await seedProducts(sellerProfile.id, shop.id, categories, brands);

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 1000,
      minOrder: 100000,
      maxUses: 1000,
      isActive: true,
    },
  });
  console.log("  coupon: WELCOME10");

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
