import type {Metadata} from "next";
import {Logo} from "../ui";
import LeadForm from "../lead-form";
import ThemeToggle from "../theme-toggle";
import {ZALO_URL,ZALO_PHONE} from "../../lib/contact";
export const metadata:Metadata={title:"Liên hệ & tư vấn",description:"Để lại thông tin để Chen Shop tư vấn chọn squishy, bean, figure và xác nhận đơn hàng. Zalo 0869.832.339."};
export default function Page(){return <><div className="announcement"><span>CHEN SHOP / A LITTLE MORE PERSONAL</span></div><header className="site-header"><div className="nav-main"><Logo/><div className="header-actions"><a className="text-button" href="/">Quay lại cửa hàng ↗</a><ThemeToggle/></div></div></header><main className="contact-page section-wrap"><div className="contact-page-copy"><span className="eyebrow muted">SAY HELLO TO CHEN</span><h1>Một lời nhắn.<br/><em>Một chút niềm vui.</em></h1><p>Chọn một người bạn nhỏ đôi khi cũng cần một người hiểu gu của bạn. Kể Chen nghe bạn đang tìm gì nhé.</p><a href={ZALO_URL} target="_blank" rel="noreferrer">Zalo {ZALO_PHONE} ↗</a></div><LeadForm/></main></>;}
