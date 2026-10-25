"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClinic } from "@/lib/clinic-store";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  LogOut,
  Wifi,
  ShieldCheck,
  Stethoscope,
  Lock,
  Globe,
  Settings,
} from "lucide-react";

export function ClinicHeader() {
  const pathname = usePathname() || "/";
  const decodedPath = decodeURIComponent(pathname);
  const {
    lang,
    setLang,
    settings,
    currentPatient,
    logoutPatient,
    isRealtimeConnected,
  } = useClinic();

  const isReceptionPortal = decodedPath.startsWith("/reception");
  const isDoctorPortal = decodedPath.startsWith("/doctor");
  const isSuperAdminPortal =
    decodedPath.startsWith("/$uper@dmin") ||
    decodedPath.startsWith("/super-admin");
  const isPatientPortal =
    !isReceptionPortal && !isDoctorPortal && !isSuperAdminPortal;

  const homeHref = isSuperAdminPortal
    ? "/$uper@dmin"
    : isReceptionPortal
    ? "/reception"
    : isDoctorPortal
    ? "/doctor"
    : "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-slate-200/90 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
      {/* Dynamic Top Accent Gradient Bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${settings.primaryColor} 0%, #1E40AF 50%, ${settings.secondaryColor} 100%)`,
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        {/* Brand Identity */}
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 focus:outline-none focus:ring-4 focus:ring-clinic-primary/30 sm:gap-3"
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md sm:h-12 sm:w-12"
            style={{
              background: `linear-gradient(135deg, ${settings.primaryColor} 0%, #1E3A8A 100%)`,
            }}
          >
            <img
              src={settings.logoUrl}
              alt={settings.clinicName}
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
            />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-base font-black tracking-tight text-slate-950 sm:text-xl md:text-2xl">
              {lang === "my" ? settings.clinicNameMy : settings.clinicName}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-emerald-800 sm:text-xs">
              <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">
                {lang === "my"
                  ? isRealtimeConnected
                    ? "တိုက်ရိုက် အလှည့်စနစ် ချိတ်ဆက်ထားသည်"
                    : "အော့ဖ်လိုင်း အသင့်ရှိသည်"
                  : isRealtimeConnected
                  ? "Live Queue Active"
                  : "Offline Ready"}
              </span>
            </span>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Language Switcher (Myanmar / English) */}
          <div className="flex min-h-[44px] items-center rounded-xl border-2 border-slate-300 bg-slate-100 p-0.5 sm:min-h-[48px] sm:p-1">
            <button
              type="button"
              onClick={() => setLang("my")}
              className={`flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black transition-all sm:min-h-[38px] sm:px-3 sm:text-sm ${
                lang === "my"
                  ? "bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-950"
              }`}
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>မြန်မာ</span>
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`flex min-h-[36px] items-center rounded-lg px-2.5 py-1 text-xs font-black transition-all sm:min-h-[38px] sm:px-3 sm:text-sm ${
                lang === "en"
                  ? "bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-950"
              }`}
            >
              <span>EN</span>
            </button>
          </div>

          {/* 1. PATIENT PORTAL HEADER: Shows ONLY Patient Credit Points & Sign Out. Zero Staff Links! */}
          {isPatientPortal && currentPatient && (
            <div className="flex items-center gap-2">
              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1 text-emerald-950 shadow-sm sm:min-h-[48px] sm:px-3.5 sm:py-1.5">
                <Wallet className="h-4 w-4 shrink-0 text-emerald-700 sm:h-5 sm:w-5" />
                <div className="leading-tight">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 sm:text-[11px]">
                    {lang === "my" ? "လက်ကျန်ပွိုင့်" : "Credit Points"}
                  </span>
                  <span className="text-sm font-black sm:text-base">
                    {formatCurrency(currentPatient.credit_points, lang)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutPatient}
                title={lang === "my" ? "အကောင့်မှထွက်ရန်" : "Sign Out"}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 sm:min-h-[48px] sm:min-w-[48px]"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">
                  {lang === "my" ? "အကောင့်မှထွက်ရန်" : "Sign Out"}
                </span>
              </button>
            </div>
          )}

          {/* 2. RECEPTION PORTAL HEADER: Dedicated Staff Badge */}
          {isReceptionPortal && (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border-2 border-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 px-3.5 py-2 text-white shadow-sm md:flex">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-black tracking-wide">
                  {lang === "my"
                    ? "Reception စီမံခန့်ခွဲမှု"
                    : "Reception Console"}
                </span>
              </div>
              <Link
                href="/doctor"
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-slate-100 sm:min-h-[48px] sm:px-3.5 sm:text-sm"
              >
                <Stethoscope className="h-4 w-4 text-clinic-primary" />
                <span>{lang === "my" ? "ဆရာဝန်အခန်း" : "Doctor Room"}</span>
              </Link>
            </div>
          )}

          {/* 3. DOCTOR PORTAL HEADER: Dedicated Doctor Room Badge */}
          {isDoctorPortal && (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border-2 border-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 px-3.5 py-2 text-white shadow-sm md:flex">
                <Stethoscope className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-black tracking-wide">
                  {lang === "my" ? "ဆရာဝန်အခန်း စနစ်" : "Doctor Portal"}
                </span>
              </div>
              <Link
                href="/reception"
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-slate-100 sm:min-h-[48px] sm:px-3.5 sm:text-sm"
              >
                <Lock className="h-4 w-4 text-clinic-primary" />
                <span>
                  {lang === "my" ? "Reception ကောင်တာ" : "Reception Desk"}
                </span>
              </Link>
            </div>
          )}

          {/* 4. SUPER ADMIN HEADER BADGE */}
          {isSuperAdminPortal && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border-2 border-amber-500 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-3 py-2 text-amber-300 shadow-sm">
                <Settings className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider sm:text-sm">
                  Super Admin
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
