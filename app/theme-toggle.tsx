"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { THEME_KEY as KEY } from "../lib/theme";

function apply(dark: boolean) {
  document.documentElement.toggleAttribute("data-theme", false);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
}

/** Sun / moon button. Follows the device setting until the visitor picks one. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(KEY); } catch {}
      if (saved !== "dark" && saved !== "light") { apply(mq.matches); setDark(mq.matches); }
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);
  function toggle() {
    const next = !dark;
    apply(next); setDark(next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch {}
  }
  return (
    <button type="button" className={`icon-btn theme-toggle ${className}`} onClick={toggle} aria-pressed={dark} aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={dark ? "Giao diện sáng" : "Giao diện tối"}>
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
