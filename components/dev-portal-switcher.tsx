"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LayoutDashboard, Stethoscope, ChevronUp, ChevronDown } from "lucide-react";

export function DevPortalSwitcher() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-2xl border-2 border-slate-900 bg-slate-900/95 p-2 text-white shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300">
            Clinic Portals Switcher
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded p-1 text-slate-300 hover:bg-white/10"
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="mt-1 flex items-center gap-1.5 pt-1 border-t border-white/10">
            <Link
              href="/"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                pathname === "/"
                  ? "bg-clinic-primary text-white"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Patient (/)
            </Link>

            <Link
              href="/reception"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                pathname?.startsWith("/reception")
                  ? "bg-clinic-primary text-white"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Reception (/reception)
            </Link>

            <Link
              href="/doctor"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                pathname?.startsWith("/doctor")
                  ? "bg-clinic-primary text-white"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Doctor (/doctor)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
