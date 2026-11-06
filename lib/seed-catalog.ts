import importedProducts from "../data/squishy-import.json";
import { batch, queryOne } from "./db";
import { PRODUCT_COLUMNS, placeholders } from "./server";

const IMPORT_ID = "chen-squishy-user-photos-20261106-v1";
const store = globalThis as unknown as { __chenCatalogReady?: boolean };

// Import is data, outside the schema. A durable ledger (catalog_imports) makes this a
// one-time import: later admin edits and deletions are never recreated.
export async function ensureCatalogImport() {
  if (store.__chenCatalogReady) return;
  if (await queryOne("SELECT id FROM catalog_imports WHERE id=$1", [IMPORT_ID])) {
    store.__chenCatalogReady = true;
    return;
  }
  const items = importedProducts.map((p) => ({
    text: `INSERT INTO products (${PRODUCT_COLUMNS}) VALUES (${placeholders(18)}) ON CONFLICT (id) DO NOTHING`,
    params: [p.id, p.name, p.brand, p.category, p.price, p.comparePrice, p.stock, p.description, p.image, p.imageSlot,
      p.published, p.featured, p.sample, p.createdAt, p.updatedAt, p.pricePending, p.stockPending, JSON.stringify(p.gallery)],
  }));
  items.push({ text: "INSERT INTO catalog_imports (id,imported_at) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", params: [IMPORT_ID, Date.now()] });
  await batch(items);
  store.__chenCatalogReady = true;
}
