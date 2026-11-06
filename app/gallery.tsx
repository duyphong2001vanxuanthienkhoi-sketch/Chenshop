"use client";
import {useState} from "react";
import {ChevronLeft,ChevronRight,Expand} from "lucide-react";
import {ProductImage} from "./ui";
import type {Product} from "../lib/catalog";
import {publicPhotos} from "../lib/photos";
export default function Gallery({product}:{product:Product}){
 const [selected,setSelected]=useState(0);
 const photos=publicPhotos(product);
 const current=photos[selected]??photos[0];
 return <div className="gallery"><div className="gallery-main"><ProductImage original product={{...product,image:current.url,imageSlot:current.url===product.image?product.imageSlot:-1}}/><span className="gallery-count">{selected+1} / {photos.length}</span>{photos.length>1&&<><button className="gallery-arrow previous" aria-label="Ảnh trước" onClick={()=>setSelected((selected+photos.length-1)%photos.length)}><ChevronLeft size={19}/></button><button className="gallery-arrow next" aria-label="Ảnh tiếp theo" onClick={()=>setSelected((selected+1)%photos.length)}><ChevronRight size={19}/></button></>}</div><div className="gallery-thumbnails">{photos.map((g,i)=><button key={g.url+i} className={selected===i?"selected":""} onClick={()=>setSelected(i)} aria-label={g.label} aria-pressed={selected===i}><ProductImage original product={{...product,image:g.url,imageSlot:g.url===product.image?product.imageSlot:-1}}/><span>{g.label}</span></button>)}</div><p className="gallery-note">Ảnh nền studio đã chỉnh phông. Bạn có thể chọn ảnh thật gốc để đối chiếu sản phẩm.</p></div>;
}
