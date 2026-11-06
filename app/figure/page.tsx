import type {Metadata} from "next";
import Storefront from "../storefront";
export const metadata:Metadata={title:"Figure collection",description:"Bộ sưu tập Figure tại Chen Shop — nhân vật cá tính, có câu chuyện.",alternates:{canonical:"/figure"}};
export default function Page(){return <Storefront initialCategory="Figure" categoryPage/>;}
