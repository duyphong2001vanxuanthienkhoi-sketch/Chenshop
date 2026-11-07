// Database schema. Every statement is idempotent and runs automatically on the
// first request after a cold start, so a fresh Neon database needs no manual setup.
// The same SQL is kept in db/schema.sql for anyone who prefers running it by hand.
export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    price BIGINT NOT NULL,
    compare_price BIGINT NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL,
    image_slot INTEGER NOT NULL DEFAULT -1,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sample BOOLEAN NOT NULL DEFAULT FALSE,
    price_pending BOOLEAN NOT NULL DEFAULT FALSE,
    stock_pending BOOLEAN NOT NULL DEFAULT FALSE,
    gallery TEXT NOT NULL DEFAULT '[]',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS products_listing_idx ON products (published, featured, created_at)`,
  `CREATE TABLE IF NOT EXISTS catalog_imports (
    id TEXT PRIMARY KEY,
    imported_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL DEFAULT '',
    instagram TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    product_id TEXT NOT NULL DEFAULT '',
    product_name TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 1,
    note TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL,
    consent BOOLEAN NOT NULL,
    created_at BIGINT NOT NULL,
    ip_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    sync_status TEXT NOT NULL DEFAULT 'pending',
    synced_at BIGINT
  )`,
  `CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at)`,
  `CREATE INDEX IF NOT EXISTS leads_ip_idx ON leads (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip_hash, created_at)`,
  // Checkout: payment + shipping settings live on the single 'shop' settings row.
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_bin TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_account TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_holder TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping_fee BIGINT NOT NULL DEFAULT 0`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS free_ship_over BIGINT NOT NULL DEFAULT 0`,
  // Guest orders. items is a JSON snapshot: [{id,name,price,qty,image,tracked}].
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    status TEXT NOT NULL DEFAULT 'new',
    items TEXT NOT NULL,
    subtotal BIGINT NOT NULL,
    shipping_fee BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    ip_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS express_fee BIGINT NOT NULL DEFAULT 0`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method TEXT NOT NULL DEFAULT 'standard'`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_mode TEXT NOT NULL DEFAULT 'phone'`,
  `CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at)`,
  `CREATE INDEX IF NOT EXISTS orders_ip_idx ON orders (ip_hash, created_at)`,
];
