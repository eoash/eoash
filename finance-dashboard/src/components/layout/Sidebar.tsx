"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "매출 현황", href: "/" },
  { label: "Cash Position", href: "/cash" },
  { label: "Income Statement", href: "/income" },
  { label: "환율 (FX)", href: "/fx" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0A0A0A] border-r border-[#222] flex flex-col justify-between p-6">
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
    </aside>
  );
}
