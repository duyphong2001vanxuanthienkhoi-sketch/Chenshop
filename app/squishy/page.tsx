import type {Metadata} from "next";
import Storefront from "../storefront";
export const metadata:Metadata={title:"Squishy collection",description:"Bộ sưu tập Squishy tại Chen Shop — ảnh thật, mẫu mới cập nhật liên tục.",alternates:{canonical:"/squishy"}};
export default function Page(){return <Storefront initialCategory="Squishy" categoryPage/>;}
