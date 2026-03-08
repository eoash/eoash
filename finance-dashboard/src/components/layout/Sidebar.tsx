"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const menuItems = [
  { label: "매출 현황", href: "/" },
  { label: "클라이언트별 매출", href: "/clients" },
  { label: "A/R 현황", href: "/ar" },
  { label: "YoY 비교", href: "/yoy" },
  { label: "Cash Position", href: "/cash" },
  { label: "Income Statement", href: "/income" },
  { label: "환율 (FX)", href: "/fx" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // 페이지 이동 시 드로어 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 드로어 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navContent = (
    <>
      <div>
        <div className="mb-8 px-4">
          <h1 className="text-lg font-bold text-white">Finance</h1>
          <p className="text-xs text-gray-500 mt-1">EO Studio Dashboard</p>
        </div>
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#E8FF47]/10 text-[#E8FF47]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4 pb-4">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          EO Studio
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-[#111] border border-[#333] text-gray-300 hover:text-white hover:bg-[#222] transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-60 bg-[#0A0A0A] border-r border-[#222]
          flex flex-col justify-between p-6 z-50
          transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* 모바일 닫기 버튼 */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 md:hidden p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 4l10 10M14 4L4 14" />
          </svg>
        </button>

        {navContent}
      </aside>
    </>
  );
}
