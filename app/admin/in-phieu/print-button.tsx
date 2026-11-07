"use client";
import { useEffect } from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  useEffect(() => { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); }, []);
  return <button type="button" className="btn red" onClick={() => window.print()}><Printer size={16} /> IN PHIẾU</button>;
}
