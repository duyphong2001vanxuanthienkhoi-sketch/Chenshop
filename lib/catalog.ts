export type Product = {
  id: string; name: string; brand: string; category: string; price: number;
  comparePrice: number; stock: number; description: string; image: string;
  imageSlot: number; published: boolean; featured: boolean; sample: boolean;
  createdAt: number; updatedAt: number;
  pricePending?: boolean; stockPending?: boolean;
  gallery?: {url:string;label:string}[];
};
export const categories = ["Bean", "Figure", "Squishy"];
export const categoryPath = (category:string) => ({Bean:"/bean",Figure:"/figure",Squishy:"/squishy"}[category]??"/#san-pham");
export const productPrice = (p:Pick<Product,"price"|"pricePending">) => p.pricePending ? "Chờ cập nhật giá" : money(p.price);
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
