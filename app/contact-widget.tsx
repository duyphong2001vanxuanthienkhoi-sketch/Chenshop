"use client";
import {usePathname} from "next/navigation";
import {MessageCircle,ArrowUpRight} from "lucide-react";
import {ZALO_URL,ZALO_PHONE} from "../lib/contact";
export default function ContactWidget(){const pathname=usePathname();if(pathname?.startsWith("/admin"))return null;return <div className="contact-floating"><a href="/lien-he" className="floating-request">Để lại thông tin <ArrowUpRight size={14}/></a><a className="zalo-floating" href={ZALO_URL} target="_blank" rel="noreferrer" aria-label={`Nhắn Zalo Chen Shop ${ZALO_PHONE}`}><span>Zalo</span><div><strong>Nhắn Chen Shop</strong><small>{ZALO_PHONE}</small></div><ArrowUpRight size={17}/></a></div>;}
