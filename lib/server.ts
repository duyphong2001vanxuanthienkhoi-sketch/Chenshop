import { isAdmin, sameOrigin } from "./auth";
import { categories } from "./catalog";

export async function adminGuard(request: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Nguồn yêu cầu không hợp lệ." }, { status: 403 });
  return null;
}

export function rowProduct(r: Record<string, unknown>) {
  let gallery = [];
  try { gallery = JSON.parse(String(r.gallery ?? "[]")); } catch {}
  return {
    id: String(r.id), name: String(r.name), brand: String(r.brand), category: String(r.category),
    price: Number(r.price), comparePrice: Number(r.compare_price), stock: Number(r.stock),
    description: String(r.description ?? ""), image: String(r.image), imageSlot: Number(r.image_slot),
    published: !!r.published, featured: !!r.featured, sample: !!r.sample,
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    pricePending: !!r.price_pending, stockPending: !!r.stock_pending, gallery,
  };
}

const BLOB_IMAGE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/products\/[a-f0-9-]+\.(jpg|png|webp)$/;
export const validImage = (url: string) =>
  /^\/api\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url) ||
  BLOB_IMAGE.test(url) ||
  /^\/products\/[a-z0-9-]+\.webp$/.test(url) ||
  url === "/images/toys.png";

export function validateProduct(x: any) {
  if (!x || typeof x !== "object") throw new Error("Thông tin sản phẩm không hợp lệ.");
  const name = String(x.name ?? "").trim(), brand = String(x.brand ?? "").trim(), description = String(x.description ?? "").trim();
  if (!name || name.length > 150) throw new Error("Tên sản phẩm cần từ 1–150 ký tự.");
  if (!brand || brand.length > 80) throw new Error("Vui lòng nhập thương hiệu, tối đa 80 ký tự.");
  if (!categories.includes(x.category)) throw new Error("Danh mục không hợp lệ.");
  for (const k of ["price", "comparePrice", "stock"]) if (!Number.isSafeInteger(x[k]) || x[k] < 0 || x[k] > (k === "stock" ? 1000000 : 1000000000000)) throw new Error("Giá và tồn kho phải là số nguyên không âm hợp lệ.");
  if (x.price === 0 && !x.pricePending) throw new Error("Nhập giá bán hoặc chọn Chờ cập nhật giá.");
  if (x.comparePrice && x.comparePrice <= x.price && !x.pricePending) throw new Error("Giá gốc phải lớn hơn giá bán, hoặc để 0.");
  if (description.length > 5000) throw new Error("Mô tả tối đa 5.000 ký tự.");
  const image = String(x.image ?? "");
  if (!validImage(image)) throw new Error("Vui lòng tải ảnh sản phẩm lên.");
  const imageSlot = image === "/images/toys.png" && Number.isInteger(x.imageSlot) && x.imageSlot >= 0 && x.imageSlot <= 3 ? x.imageSlot : -1;
  const gallery = Array.isArray(x.gallery) ? x.gallery.slice(0, 6).map((g: any) => ({ url: String(g?.url ?? ""), label: String(g?.label ?? "Ảnh sản phẩm").slice(0, 60) })) : [];
  if (gallery.some((g: { url: string }) => !validImage(g.url))) throw new Error("Ảnh trong bộ ảnh không hợp lệ.");
  return {
    name, brand, category: x.category as string,
    price: x.pricePending ? 0 : x.price, comparePrice: x.pricePending ? 0 : x.comparePrice, stock: x.stockPending ? 0 : x.stock,
    description, image, imageSlot,
    published: x.published === true, featured: x.featured === true, sample: x.sample === true,
    pricePending: x.pricePending === true, stockPending: x.stockPending === true, gallery,
  };
}

export const jsonError = (error: unknown, status = 400) =>
  Response.json({ error: error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại." }, { status });

export const PRODUCT_COLUMNS =
  "id,name,brand,category,price,compare_price,stock,description,image,image_slot,published,featured,sample,created_at,updated_at,price_pending,stock_pending,gallery";
export const productValues = (id: string, p: ReturnType<typeof validateProduct>, createdAt: number, updatedAt: number) => [
  id, p.name, p.brand, p.category, p.price, p.comparePrice, p.stock, p.description, p.image, p.imageSlot,
  p.published, p.featured, p.sample, createdAt, updatedAt, p.pricePending, p.stockPending, JSON.stringify(p.gallery),
];
export const placeholders = (count: number, offset = 0) => Array.from({ length: count }, (_, i) => `$${i + 1 + offset}`).join(",");
