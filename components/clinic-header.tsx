"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CLINIC_NAME,
  CLINIC_NAME_MY,
  LOGO_URL,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
} from "@/clinic.config";
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
} from "lucide-react";

export function ClinicHeader() {
  const pathname = usePathname();
  const {
    lang,
    setLang,
    currentPatient,
    logoutPatient,
    isRealtimeConnected,
  } = useClinic();

  const isReceptionPortal = pathname?.startsWith("/reception");
  const isDoctorPortal = pathname?.startsWith("/doctor");
  const isPatientPortal = !isReceptionPortal && !isDoctorPortal;

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-slate-200/90 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
      {/* Top Accent Gradient Bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${PRIMARY_COLOR} 0%, #1E40AF 50%, ${SECONDARY_COLOR} 100%)`,
        }}
      />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <Link
          href={isReceptionPortal ? "/reception" : isDoctorPortal ? "/doctor" : "/"}
          className="flex items-center gap-3 rounded-xl py-1 pr-2 focus:outline-none focus:ring-4 focus:ring-clinic-primary/30"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md"
            style={{
              background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #1E3A8A 100%)`,
            }}
          >
            <img
              src={LOGO_URL}
              alt={CLINIC_NAME}
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <span className="block text-lg font-black tracking-tight text-slate-950 sm:text-2xl">
              {lang === "my" ? CLINIC_NAME_MY : CLINIC_NAME}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-emerald-800">
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              {lang === "my"
                ? isRealtimeConnected
                  ? "တိုက်ရိုက် အလှည့်စနစ် ချိတ်ဆက်ထားသည်"
                  : "အော့ဖ်လိုင်း အသင့်ရှိသည်"
                : isRealtimeConnected
                ? "Live Queue Active"
                : "Offline Ready"}
            </span>
          </div>
        </Link>

        {/* Right Side Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dual Language Switcher (Myanmar / English) */}
          <div className="flex min-h-[48px] items-center rounded-xl border-2 border-slate-300 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setLang("my")}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-black transition-all ${
                lang === "my"
                  ? "bg-gradient-to-r from-clinic-primary to-blue-800 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-950"
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>မြန်မာ</span>
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`flex min-h-[38px] items-center rounded-lg px-3 py-1 text-sm font-black transition-all ${
                lang === "en"
                  ? "bg-gradient-to-r from-clinic-primary to-blue-800 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-950"
              }`}
            >
              <span>EN</span>
            </button>
          </div>

          {/* 1. PATIENT PORTAL HEADER: Shows ONLY Patient Credit Points & Sign Out. Zero Staff Links! */}
          {isPatientPortal && currentPatient && (
            <div className="flex items-center gap-2">
              <div className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 px-3.5 py-1.5 text-emerald-950 shadow-sm">
                <Wallet className="h-5 w-5 text-emerald-700" />
                <div className="leading-tight">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    {lang === "my" ? "လက်ကျန်ပွိုင့်ငွေ" : "Credit Points"}
                  </span>
                  <span className="text-base font-black">
                    {formatCurrency(currentPatient.credit_points, lang)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={logoutPatient}
                title={lang === "my" ? "အကောင့်မှထွက်ရန်" : "Sign Out"}
                className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100"
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
              <div className="hidden items-center gap-2 rounded-xl border-2 border-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 px-3.5 py-2 text-white shadow-sm sm:flex">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-black tracking-wide">
                  {lang === "my" ? "Reception စီမံခန့်ခွဲမှု" : "Reception Console"}
                </span>
              </div>
              <Link
                href="/doctor"
                className="flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                <Stethoscope className="h-4 w-4 text-clinic-primary" />
                <span>{lang === "my" ? "ဆရာဝန်အခန်း" : "Doctor Room"}</span>
              </Link>
            </div>
          )}

          {/* 3. DOCTOR PORTAL HEADER: Dedicated Doctor Room Badge */}
          {isDoctorPortal && (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-xl border-2 border-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 px-3.5 py-2 text-white shadow-sm sm:flex">
                <Stethoscope className="h-5 w-5 text-sky-400" />
                <span className="text-sm font-black tracking-wide">
                  {lang === "my" ? "ဆရာဝန်အခန်း စနစ်" : "Doctor Portal"}
                </span>
              </div>
              <Link
                href="/reception"
                className="flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                <Lock className="h-4 w-4 text-clinic-primary" />
                <span>{lang === "my" ? "Reception ကောင်တာ" : "Reception Desk"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
