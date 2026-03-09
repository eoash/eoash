"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useT } from "@/lib/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n";
import type { ReactNode } from "react";

const iconProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const menuItems: { labelKey: TranslationKey; href: string; icon: ReactNode }[] = [
  { labelKey: "nav.revenue", href: "/", icon: (
    <svg {...iconProps}><path d="M2 12l3-4 3 2 4-5 2 2" /><path d="M2 14h12" /></svg>
  )},
  { labelKey: "nav.clients", href: "/clients", icon: (
    <svg {...iconProps}><rect x="3" y="6" width="10" height="8" rx="1" /><path d="M5 6V4a3 3 0 0 1 6 0v2" /></svg>
  )},
  { labelKey: "nav.ar", href: "/ar", icon: (
    <svg {...iconProps}><circle cx="8" cy="8" r="6" /><path d="M8 4v4l2.5 1.5" /></svg>
  )},
  { labelKey: "nav.yoy", href: "/yoy", icon: (
    <svg {...iconProps}><path d="M2 14V8M6 14V4M10 14V6M14 14V2" /></svg>
  )},
  { labelKey: "nav.cash", href: "/cash", icon: (
    <svg {...iconProps}><rect x="1.5" y="4" width="13" height="9" rx="1.5" /><path d="M1.5 7h13" /><circle cx="8" cy="10" r="1.5" /></svg>
  )},
  { labelKey: "nav.income", href: "/income", icon: (
    <svg {...iconProps}><rect x="2" y="1.5" width="12" height="13" rx="1" /><path d="M5 5h6M5 8h6M5 11h3" /></svg>
  )},
  { labelKey: "nav.fx", href: "/fx", icon: (
    <svg {...iconProps}><circle cx="5.5" cy="6" r="3.5" /><circle cx="10.5" cy="10" r="3.5" /><path d="M4 7.5l3-3M9 12.5l3-3" /></svg>
  )},
];

type SyncState = "idle" | "syncing" | "done" | "fail";

export default function Sidebar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useT();
  const [open, setOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");

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
          <h1 className="text-lg font-bold text-white">{t("sidebar.title")}</h1>
          <p className="text-xs text-gray-500 mt-1">{t("sidebar.subtitle")}</p>
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
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#00E87A]/10 text-[#00E87A]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {/* Sync button */}
        {process.env.NEXT_PUBLIC_SYNC_URL && (
          <button
            onClick={async () => {
              if (syncState === "syncing") return;
              setSyncState("syncing");
              try {
                const res = await fetch(process.env.NEXT_PUBLIC_SYNC_URL!);
                const data = await res.json();
                setSyncState(data.ok ? "done" : "fail");
              } catch {
                setSyncState("fail");
              }
              setTimeout(() => setSyncState("idle"), 3000);
            }}
            disabled={syncState === "syncing"}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              syncState === "syncing"
                ? "bg-[#00E87A]/10 text-[#00E87A] animate-pulse"
                : syncState === "done"
                  ? "bg-green-900/30 text-green-400"
                  : syncState === "fail"
                    ? "bg-red-900/30 text-red-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              className={syncState === "syncing" ? "animate-spin" : ""}>
              <path d="M1 7a6 6 0 0 1 10.2-4.2M13 7a6 6 0 0 1-10.2 4.2" />
              <path d="M11.2 1v2.8H8.4M2.8 13v-2.8h2.8" />
            </svg>
            {syncState === "syncing" ? t("sidebar.syncing")
              : syncState === "done" ? t("sidebar.syncDone")
              : syncState === "fail" ? t("sidebar.syncFail")
              : t("sidebar.sync")}
          </button>
        )}

        {/* Language toggle */}
        <div className="flex items-center gap-1 px-0 py-1">
          <button
            onClick={() => setLocale("ko")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              locale === "ko"
                ? "bg-[#00E87A]/10 text-[#00E87A]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            한국어
          </button>
          <span className="text-gray-600">/</span>
          <button
            onClick={() => setLocale("en")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              locale === "en"
                ? "bg-[#00E87A]/10 text-[#00E87A]"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            EN
          </button>
        </div>

        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          {t("sidebar.brand")}
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
