import type {Metadata} from "next";
import Storefront from "../storefront";
export const metadata:Metadata={title:"Bean collection",description:"Bộ sưu tập Bean tại Chen Shop — những người bạn nhỏ mềm mại.",alternates:{canonical:"/bean"}};
export default function Page(){return <Storefront initialCategory="Bean" categoryPage/>;}
