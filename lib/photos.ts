import studioImages from "../data/studio-images.json";
import type {Product} from "./catalog";
export const studioMap=studioImages as Record<string,string>;
export const coverImage=(url:string)=>studioMap[url]??url;
export function publicPhotos(p:Product){
 const raw=(p.gallery?.length?p.gallery:[{url:p.image,label:"Ảnh sản phẩm"}]).filter(g=>!/(mặt sau|và giá|nhãn giá)/i.test(g.label)&&!/^\/products\/source-(7|9)\.webp$/.test(g.url));
 const studio=studioMap[p.image];
 return studio?[{url:studio,label:"Ảnh nền studio"},{url:p.image,label:"Ảnh thật gốc"},...raw.filter(g=>g.url!==p.image)]:raw;
}
