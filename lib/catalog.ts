export type Product = {
  id: string; name: string; brand: string; category: string; price: number;
  comparePrice: number; stock: number; description: string; image: string;
  imageSlot: number; published: boolean; featured: boolean; sample: boolean;
  createdAt: number; updatedAt: number;
  pricePending?: boolean; stockPending?: boolean;
  gallery?: {url:string;label:string}[];
  details?: ProductDetails;
};
/** Optional product facts shown on the product page and used by filters. */
export type ProductDetails = {
  size?: string;      // e.g. "10 × 8 × 5 cm"
  material?: string;  // e.g. "Mút PU mềm"
  slowRise?: number;  // 0 = not stated, 1 (fast) … 5 (very slow rising)
  scent?: string;     // e.g. "Vani nhẹ"
  video?: string;     // YouTube / TikTok link or uploaded .mp4
  tags?: string[];    // themes chosen by the shop; empty = guessed from the name
};
export const categories = ["Bean", "Figure", "Squishy"];
export const categoryPath = (category:string) => ({Bean:"/bean",Figure:"/figure",Squishy:"/squishy"}[category]??"/#san-pham");
export const productPrice = (p:Pick<Product,"price"|"pricePending">) => p.pricePending ? "Sắp về hàng" : money(p.price);

/** Lowercase without Vietnamese accents, so "banh may" finds "Bánh Mây". */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export const THEMES = ["Bánh ngọt", "Động vật", "Món ăn", "Trái cây", "Hoa & mây"];
// Matched on the accented name: without accents "nhỏ" (small) would look like "nho" (grape).
const word = (list: string) => new RegExp(`(?<!\\p{L})(${list})(?!\\p{L})`, "u");
const THEME_RULES: [string, RegExp][] = [
  ["Động vật", word("cú|mèo|gấu|cún|thỏ|heo|hải cẩu|chim|vịt|cá|khủng long|chó|gà|ếch|chuột|cáo")],
  ["Bánh ngọt", word("bánh|toast|waffle|pudding|cookie|kem|kẹo|socola|cacao|caramel")],
  ["Món ăn", word("burger|sandwich|boba|mì|bao|xúc xích|pizza|cơm")],
  ["Trái cây", word("nho|cam|dâu|cherry|bưởi|dưa|đào|chanh|táo|lê|mọng")],
  ["Hoa & mây", word("hoa|mây|bướm|sao|cầu vồng")],
];
export function productTags(p: Pick<Product, "name" | "details">): string[] {
  const chosen = (p.details?.tags ?? []).filter((t) => THEMES.includes(t));
  if (chosen.length) return chosen;
  const name = p.name.normalize("NFC").toLowerCase();
  return THEME_RULES.filter(([, re]) => re.test(name)).map(([t]) => t);
}
const DAY = 86400000;
export const isNewArrival = (p: Pick<Product, "createdAt">) => p.createdAt > 0 && Date.now() - p.createdAt < 30 * DAY;
export const isOnSale = (p: Pick<Product, "comparePrice" | "price" | "pricePending">) => !p.pricePending && p.comparePrice > p.price;
export const SLOW_RISE = ["", "Nở nhanh", "Nở khá nhanh", "Nở vừa", "Nở chậm", "Nở rất chậm"];
export const productAlt = (p: Pick<Product, "name"> & { category?: string }) =>
  p.category && !p.name.toLowerCase().includes(p.category.toLowerCase()) ? `${p.category} ${p.name}` : p.name;
export const productStock = (p:Pick<Product,"stock"|"stockPending">) => p.stockPending ? "Nhận đặt hàng — shop xác nhận khi gọi lại" : p.stock>0 ? `Còn ${p.stock} sản phẩm` : "Tạm hết hàng";
export const money = (value: number) => new Intl.NumberFormat("vi-VN", {style:"currency",currency:"VND",maximumFractionDigits:0}).format(value);
const common = { image:"/images/toys.png", published:true, featured:true, sample:true, createdAt:0, updatedAt:0 };
export const samples: Product[] = [
  {...common, id:"sample-bunny", name:"Luna Bunny — Starry Night", brand:"CHEN STUDIO", category:"Figure", price:390000, comparePrice:0, stock:12, imageSlot:0, description:"Một ngôi sao nhỏ, một giấc mơ lớn. Nhân vật thỏ Luna với chiếc mũ tím và ngôi sao vàng. Sản phẩm và giá minh họa cho giao diện; chưa phải hàng đang bán."},
  {...common, id:"sample-bear", name:"Cloud Bear — Soft Moments", brand:"CHEN STUDIO", category:"Bean", price:450000, comparePrice:520000, stock:8, imageSlot:1, description:"Một cái ôm thật mềm cho những ngày cần chậm lại. Chú gấu màu đào ôm chiếc mây trắng. Sản phẩm và giá minh họa cho giao diện; chưa phải hàng đang bán."},
  {...common, id:"sample-dino", name:"Little Dino — Garden Days", brand:"CHEN STUDIO", category:"Squishy", price:290000, comparePrice:0, stock:5, imageSlot:2, description:"Người bạn nhỏ mang theo một khu vườn. Little Dino với tông xanh mint và bông hoa cúc. Sản phẩm và giá minh họa cho giao diện; chưa phải hàng đang bán."},
  {...common, id:"sample-duck", name:"Sunny Duck — On My Way", brand:"CHEN STUDIO", category:"Bean", price:320000, comparePrice:0, stock:0, imageSlot:3, description:"Bật nhạc lên và đi tìm những niềm vui nhỏ cùng Sunny Duck. Sản phẩm và giá minh họa cho giao diện; chưa phải hàng đang bán."},
];
export function pictureStyle(p: Pick<Product,"image"|"imageSlot">) {
  const sprite = p.image === "/images/toys.png" && p.imageSlot >= 0;
  return { backgroundImage:`url("${p.image.replace(/["\\\n\r]/g, "")}")`, backgroundSize: sprite ? "200% 200%" : "cover", backgroundPosition: sprite ? [`0% 0%`,`100% 0%`,`0% 100%`,`100% 100%`][p.imageSlot] : "center" };
}
