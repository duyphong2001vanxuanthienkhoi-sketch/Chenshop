"use client";
import {useEffect,useRef, type ReactNode} from "react";
import {X,Package} from "lucide-react";
import {pictureStyle,productAlt,type Product} from "../lib/catalog";
import {coverImage} from "../lib/photos";
export function ProductImage({product,className="",original=false}:{product:Pick<Product,"image"|"imageSlot"|"name">&{category?:string};className?:string;original?:boolean}) {
 const url=original?product.image:coverImage(product.image);
 const alt=productAlt(product);
 if(url.startsWith("/studio/"))return <div className={`product-image studio-photo ${className}`}><img src={url} alt={alt} loading="lazy" decoding="async"/></div>;
 if(product.image.startsWith("/products/"))return <div className={`product-image original-photo ${className}`}><div className="product-photo-frame"><img src={product.image} alt={alt} loading="lazy" decoding="async"/></div><span className="original-photo-label">CHEN SHOP / ORIGINAL PHOTO</span></div>;
 return product.image ? <div role="img" aria-label={alt} className={`product-image ${className}`} style={pictureStyle(product)}/> : <div className={`product-image image-empty ${className}`}><Package size={34}/><span>Chưa có ảnh</span></div>;
}
export function Modal({open,onClose,title,children,wide=false}:{open:boolean;onClose:()=>void;title:string;children:ReactNode;wide?:boolean}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(!d)return;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
 useEffect(()=>{if(open){const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=old;};}},[open]);
 return <dialog ref={ref} className={`modal ${wide?"wide":""}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-inner"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="Đóng" onClick={onClose}><X/></button></div>{children}</div></dialog>;
}
export function Logo({dark=false}:{dark?:boolean}) {return <a href="/" className={`logo ${dark?"inverse":""}`} aria-label="Chen Shop — Trang chủ"><span className="logo-mark">CHEN<span>SHOP</span></span><span className="logo-caption">ART TOYS<br/>& LITTLE JOYS</span></a>;}
