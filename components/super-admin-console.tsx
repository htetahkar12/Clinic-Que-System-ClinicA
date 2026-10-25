"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  useClinic,
  uploadImageToCloudinaryOrDataUrl,
} from "@/lib/clinic-store";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldAlert,
  Lock,
  Save,
  Upload,
  Palette,
  Building2,
  CreditCard,
  KeyRound,
  Users,
  RefreshCw,
  CheckCircle2,
  LogOut,
  ExternalLink,
  Wallet,
} from "lucide-react";

const SUPER_ADMIN_AUTH_KEY = "auracare_superadmin_authed_v1";

export function SuperAdminConsole() {
  const {
    lang,
    settings,
    patients,
    doctors,
    bookings,
    updateClinicSettings,
    updateSuperAdminPin,
    adjustPatientCredits,
    resetDemoData,
  } = useClinic();

  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SUPER_ADMIN_AUTH_KEY) === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Form state synced with settings
  const [clinicNameMy, setClinicNameMy] = useState(settings.clinicNameMy);
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [subtitleMy, setSubtitleMy] = useState(settings.subtitleMy);
  const [subtitleEn, setSubtitleEn] = useState(settings.subtitleEn);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(settings.secondaryColor);
  const [defaultFee, setDefaultFee] = useState(settings.defaultFee);
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone);
  const [addressMy, setAddressMy] = useState(settings.addressMy);
  const [addressEn, setAddressEn] = useState(settings.addressEn);

  // Payment accounts state
  const [kpayName, setKpayName] = useState(
    settings.paymentAccounts.kpay.accountName
  );
  const [kpayNumber, setKpayNumber] = useState(
    settings.paymentAccounts.kpay.accountNumber
  );
  const [waveName, setWaveName] = useState(
    settings.paymentAccounts.wavepay.accountName
  );
  const [waveNumber, setWaveNumber] = useState(
    settings.paymentAccounts.wavepay.accountNumber
  );
  const [ayaName, setAyaName] = useState(
    settings.paymentAccounts.ayapay.accountName
  );
  const [ayaNumber, setAyaNumber] = useState(
    settings.paymentAccounts.ayapay.accountNumber
  );

  // Passwords state
  const [receptionPinOverride, setReceptionPinOverride] = useState(
    settings.receptionPin
  );
  const [currentAdminPin, setCurrentAdminPin] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");

  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [adminPinError, setAdminPinError] = useState("");

  useEffect(() => {
    setClinicNameMy(settings.clinicNameMy);
    setClinicName(settings.clinicName);
    setSubtitleMy(settings.subtitleMy);
    setSubtitleEn(settings.subtitleEn);
    setLogoUrl(settings.logoUrl);
    setPrimaryColor(settings.primaryColor);
    setSecondaryColor(settings.secondaryColor);
    setDefaultFee(settings.defaultFee);
    setClinicPhone(settings.clinicPhone);
    setAddressMy(settings.addressMy);
    setAddressEn(settings.addressEn);
    setKpayName(settings.paymentAccounts.kpay.accountName);
    setKpayNumber(settings.paymentAccounts.kpay.accountNumber);
    setWaveName(settings.paymentAccounts.wavepay.accountName);
    setWaveNumber(settings.paymentAccounts.wavepay.accountNumber);
    setAyaName(settings.paymentAccounts.ayapay.accountName);
    setAyaNumber(settings.paymentAccounts.ayapay.accountNumber);
    setReceptionPinOverride(settings.receptionPin);
  }, [settings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === settings.superAdminPin) {
      sessionStorage.setItem(SUPER_ADMIN_AUTH_KEY, "true");
      setIsAuthed(true);
      setPasswordInput("");
      setLoginError("");
    } else {
      setLoginError(
        lang === "my"
          ? "Super Admin စကားဝှက် မှားယွင်းနေပါသည်။"
          : "Invalid Super Admin password."
      );
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SUPER_ADMIN_AUTH_KEY);
    setIsAuthed(false);
    setPasswordInput("");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploadedUrl = await uploadImageToCloudinaryOrDataUrl(file);
    setLogoUrl(uploadedUrl);
  };

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateClinicSettings({
      clinicNameMy: clinicNameMy.trim() || clinicName.trim(),
      clinicName: clinicName.trim() || clinicNameMy.trim(),
      subtitleMy,
      subtitleEn,
      logoUrl,
      primaryColor,
      secondaryColor,
      defaultFee: Number(defaultFee) || 15000,
      clinicPhone,
      addressMy,
      addressEn,
      receptionPin: receptionPinOverride.trim() || "1234",
      paymentAccounts: {
        kpay: {
          ...settings.paymentAccounts.kpay,
          accountName: kpayName.trim(),
          accountNumber: kpayNumber.trim(),
        },
        wavepay: {
          ...settings.paymentAccounts.wavepay,
          accountName: waveName.trim(),
          accountNumber: waveNumber.trim(),
        },
        ayapay: {
          ...settings.paymentAccounts.ayapay,
          accountName: ayaName.trim(),
          accountNumber: ayaNumber.trim(),
        },
      },
    });
    setBannerMessage(
      lang === "my"
        ? "ဆေးခန်းအမည်၊ Logo၊ အရောင်များနှင့် ငွေလွှဲအကောင့် Setting အားလုံးကို တစ်ပြိုင်နက် သိမ်းဆည်းပြီးပါပြီ!"
        : "All clinic branding, logo, colors, and payment settings have been updated live!"
    );
  };

  const handleChangeSuperAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPinError("");
    if (newAdminPin.trim().length < 4) {
      setAdminPinError(
        lang === "my"
          ? "စကားဝှက်အသစ်သည် အနည်းဆုံး ၄ လုံး ရှိရပါမည်။"
          : "New password must be at least 4 characters."
      );
      return;
    }
    if (newAdminPin.trim() !== confirmAdminPin.trim()) {
      setAdminPinError(
        lang === "my"
          ? "စကားဝှက်အသစ် နှစ်ခု တူညီမှု မရှိပါ။"
          : "New passwords do not match."
      );
      return;
    }
    const ok = await updateSuperAdminPin(currentAdminPin, newAdminPin);
    if (!ok) {
      setAdminPinError(
        lang === "my"
          ? "လက်ရှိ Super Admin စကားဝှက် မှားယွင်းနေပါသည်။"
          : "Current Super Admin password is incorrect."
      );
      return;
    }
    setCurrentAdminPin("");
    setNewAdminPin("");
    setConfirmAdminPin("");
    setBannerMessage(
      lang === "my"
        ? "Super Admin စကားဝှက်အသစ်ကို အောင်မြင်စွာ ပြောင်းလဲသိမ်းဆည်းပြီးပါပြီ။"
        : "Super Admin password updated successfully."
    );
  };

  if (!isAuthed) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-14">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-800 bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black">Super Admin Control</h1>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {lang === "my"
                ? "ဆေးခန်းပိုင်ရှင် / Super Admin သီးသန့် ဝင်ရောက်ရန် စကားဝှက် ရိုက်ထည့်ပါ။"
                : "Owner & Super Admin access only. Enter your master password."}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "Super Admin စကားဝှက် (Password)"
                  : "Super Admin Password"}
              </label>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-900 bg-slate-50 px-4">
                <Lock className="h-5 w-5 text-slate-700" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="min-h-[56px] w-full bg-transparent text-center text-2xl font-black tracking-widest text-slate-950 focus:outline-none"
                />
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-extrabold text-red-900">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-6 py-3.5 text-lg font-black text-amber-300 shadow-lg hover:opacity-95"
            >
              {lang === "my"
                ? "Super Admin စနစ် ဖွင့်မည်"
                : "Unlock Super Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
      {/* Top Super Admin Hero Banner */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              <ShieldAlert className="h-4 w-4" />
              <span>White-Label SaaS Master Control (/$uper@dmin)</span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {lang === "my"
                ? "ဆေးခန်းအမည်၊ Logo၊ ငွေလွှဲအကောင့်နှင့် Password များ စီမံခန့်ခွဲမှု"
                : "Master Clinic Branding, Payment & Security Settings"}
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-300 sm:text-base">
              {lang === "my"
                ? "ဤနေရာမှ ပြင်ဆင်လိုက်သမျှသည် လူနာဖုန်း၊ Reception နှင့် ဆရာဝန်အခန်း အားလုံးတွင် ချက်ချင်း ပြောင်းလဲသွားပါမည်။"
                : "Changes saved here apply live across Patient Portal, Reception Console, and Doctor Rooms."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-black text-white hover:bg-white/20 sm:text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{lang === "my" ? "လူနာ Portal" : "Patient Portal"}</span>
            </Link>
            <Link
              href="/reception"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-black text-white hover:bg-white/20 sm:text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Reception</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/20 px-3.5 py-2 text-xs font-black text-amber-300 hover:bg-amber-500/30 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>{lang === "my" ? "ထွက်မည်" : "Lock"}</span>
            </button>
          </div>
        </div>
      </div>

      {bannerMessage && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-emerald-950 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
            <p className="text-sm font-extrabold sm:text-base">
              {bannerMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="rounded-lg border border-emerald-700 px-3 py-1 text-xs font-black"
          >
            OK
          </button>
        </div>
      )}

      <form onSubmit={handleSaveAllSettings} className="space-y-6">
        {/* 1. BRANDING & LOGO SETTINGS */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div className="mb-5 flex items-center gap-2.5 border-b-2 border-slate-100 pb-3">
            <Building2 className="h-6 w-6 text-clinic-primary" />
            <h2 className="text-xl font-black text-slate-950">
              {lang === "my"
                ? "၁။ ဆေးခန်းအမည်၊ Logo နှင့် အရောင်များ (White-Label Branding)"
                : "1. Clinic Identity, Logo & Theme Colors"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                ဆေးခန်းအမည် (မြန်မာဘာသာ) *
              </label>
              <input
                type="text"
                required
                value={clinicNameMy}
                onChange={(e) => setClinicNameMy(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-base font-black text-slate-950"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                Clinic Name (English) *
              </label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-base font-black text-slate-950"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                ဆောင်ပုဒ် / Subtitle (မြန်မာ)
              </label>
              <input
                type="text"
                value={subtitleMy}
                onChange={(e) => setSubtitleMy(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                Tagline / Subtitle (English)
              </label>
              <input
                type="text"
                value={subtitleEn}
                onChange={(e) => setSubtitleEn(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                ပုံသေ စမ်းသပ်ခ (Default Consultation Fee - MMK)
              </label>
              <input
                type="number"
                step={500}
                value={defaultFee}
                onChange={(e) => setDefaultFee(Number(e.target.value))}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                ဆေးခန်း ဖုန်းနံပါတ် (Clinic Contact Phone)
              </label>
              <input
                type="text"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
              />
            </div>
          </div>

          {/* Logo & Theme Colors */}
          <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <img
                  src={logoUrl}
                  alt="Clinic Logo Preview"
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-extrabold uppercase text-slate-700">
                  {lang === "my"
                    ? "ဆေးခန်း Logo ပုံတင်ရန် သို့မဟုတ် URL ထည့်ရန်"
                    : "Upload Logo Image or Paste URL"}
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-800">
                    <Upload className="h-4 w-4" />
                    <span>
                      {lang === "my" ? "Logo ပုံရွေးမည်" : "Upload Logo"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="/logo-clinic.svg"
                    className="min-h-[40px] flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-extrabold uppercase text-slate-700">
                  <Palette className="h-3.5 w-3.5" /> Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-black"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-extrabold uppercase text-slate-700">
                  <Palette className="h-3.5 w-3.5" /> Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-black"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. PAYMENT ACCOUNTS (KPAY, WAVEPAY, AYA PAY) */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div className="mb-5 flex items-center gap-2.5 border-b-2 border-slate-100 pb-3">
            <CreditCard className="h-6 w-6 text-clinic-primary" />
            <h2 className="text-xl font-black text-slate-950">
              {lang === "my"
                ? "၂။ ငွေလက်ခံမည့် KBZPay, WavePay, AYA Pay အကောင့်များ"
                : "2. Clinic Mobile Banking Accounts (KPay, WavePay, AYA Pay)"}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* KBZPay */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <span className="inline-block rounded-lg bg-blue-700 px-3 py-1 text-xs font-black text-white">
                KBZPay (KPay)
              </span>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  အကောင့်အမည် (Account Name)
                </label>
                <input
                  type="text"
                  value={kpayName}
                  onChange={(e) => setKpayName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  KPay ဖုန်းနံပါတ် (Phone Number)
                </label>
                <input
                  type="text"
                  value={kpayNumber}
                  onChange={(e) => setKpayNumber(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-black"
                />
              </div>
            </div>

            {/* WavePay */}
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <span className="inline-block rounded-lg bg-amber-500 px-3 py-1 text-xs font-black text-slate-950">
                WavePay
              </span>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  အကောင့်အမည် (Account Name)
                </label>
                <input
                  type="text"
                  value={waveName}
                  onChange={(e) => setWaveName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  WavePay ဖုန်းနံပါတ် (Phone Number)
                </label>
                <input
                  type="text"
                  value={waveNumber}
                  onChange={(e) => setWaveNumber(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-black"
                />
              </div>
            </div>

            {/* AYA Pay */}
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 space-y-3">
              <span className="inline-block rounded-lg bg-rose-700 px-3 py-1 text-xs font-black text-white">
                AYA Pay
              </span>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  အကောင့်အမည် (Account Name)
                </label>
                <input
                  type="text"
                  value={ayaName}
                  onChange={(e) => setAyaName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-extrabold text-slate-700">
                  AYA Pay ဖုန်းနံပါတ် (Phone Number)
                </label>
                <input
                  type="text"
                  value={ayaNumber}
                  onChange={(e) => setAyaNumber(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. RECEPTION STAFF PASSWORD OVERRIDE */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <KeyRound className="h-6 w-6 text-clinic-primary" />
            <h2 className="text-xl font-black text-slate-950">
              {lang === "my"
                ? "၃။ Reception နှင့် ဆရာဝန်အခန်း ဝင်ရောက်သည့် Password သတ်မှတ်ရန်"
                : "3. Reception & Doctor Staff Password Control"}
            </h2>
          </div>
          <div className="max-w-md">
            <label className="mb-1 block text-sm font-extrabold text-slate-800">
              {lang === "my"
                ? "Reception ဝန်ထမ်း Password (ဝန်ထမ်းများ မေ့သွားပါက ဤနေရာမှ တိုက်ရိုက် ပြန်ပြင်ပေးနိုင်ပါသည်)"
                : "Reception Staff Password (Can also be changed by Reception staff)"}
            </label>
            <input
              type="text"
              required
              value={receptionPinOverride}
              onChange={(e) => setReceptionPinOverride(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-lg font-black text-slate-950"
            />
          </div>
        </div>

        {/* Save All Branding & Settings Button */}
        <button
          type="submit"
          className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-8 py-4 text-xl font-black text-white shadow-xl transition-all hover:opacity-95"
        >
          <Save className="h-6 w-6" />
          <span>
            {lang === "my"
              ? "ဆေးခန်း Setting အားလုံးကို သိမ်းဆည်းမည်"
              : "Save All Clinic Settings Now"}
          </span>
        </button>
      </form>

      {/* 4. SUPER ADMIN PASSWORD CHANGE & PATIENT CREDIT CONTROL */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Super Admin Own Password Change */}
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div className="mb-4 flex items-center gap-2.5">
            <Lock className="h-6 w-6 text-amber-600" />
            <h2 className="text-xl font-black text-slate-950">
              {lang === "my"
                ? "Super Admin ၏ Password ပြောင်းလဲရန်"
                : "Change Super Admin Password"}
            </h2>
          </div>

          <form onSubmit={handleChangeSuperAdminPassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "လက်ရှိ Super Admin Password"
                  : "Current Super Admin Password"}
              </label>
              <input
                type="password"
                required
                value={currentAdminPin}
                onChange={(e) => setCurrentAdminPin(e.target.value)}
                placeholder="••••••••"
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-lg font-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "Super Admin Password အသစ်"
                  : "New Super Admin Password"}
              </label>
              <input
                type="password"
                required
                value={newAdminPin}
                onChange={(e) => setNewAdminPin(e.target.value)}
                placeholder="••••••••"
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-lg font-black"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "Password အသစ် ထပ်မံအတည်ပြုပါ"
                  : "Confirm New Password"}
              </label>
              <input
                type="password"
                required
                value={confirmAdminPin}
                onChange={(e) => setConfirmAdminPin(e.target.value)}
                placeholder="••••••••"
                className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-lg font-black"
              />
            </div>

            {adminPinError && (
              <div className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-extrabold text-red-900">
                {adminPinError}
              </div>
            )}

            <button
              type="submit"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-base font-black text-amber-300 shadow-md hover:bg-slate-800"
            >
              <KeyRound className="h-5 w-5" />
              <span>
                {lang === "my"
                  ? "Super Admin Password ပြောင်းမည်"
                  : "Update Super Admin Password"}
              </span>
            </button>
          </form>
        </div>

        {/* Patient Credit Points & System Reset */}
        <div className="flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-7">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="h-6 w-6 text-clinic-primary" />
                <h2 className="text-xl font-black text-slate-950">
                  {lang === "my"
                    ? "လူနာများနှင့် Credit Points စာရင်း"
                    : "Patients & Credit Points"}
                </h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                {patients.length} Patients • {doctors.length} Doctors •{" "}
                {bookings.length} Bookings
              </span>
            </div>

            <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      {p.name}
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      {p.phone} •{" "}
                      <span className="text-emerald-800">
                        {formatCurrency(p.credit_points, lang)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        adjustPatientCredits(p.id, p.credit_points + 15000)
                      }
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-emerald-700 px-2.5 py-1 text-xs font-black text-white hover:bg-emerald-800"
                    >
                      <Wallet className="h-3.5 w-3.5" /> +15,000
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPatientCredits(p.id, 0)}
                      className="inline-flex min-h-[36px] items-center rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      0
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t-2 border-slate-100 pt-4">
            <button
              type="button"
              onClick={async () => {
                await resetDemoData();
                setBannerMessage(
                  lang === "my"
                    ? "ဆရာဝန်နှင့် အလှည့်နံပါတ် စမ်းသပ်ဒေတာများကို မူလအတိုင်း ပြန်လည် သတ်မှတ်ပြီးပါပြီ။"
                    : "Queue and booking demo data have been reset."
                );
              }}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              <span>
                {lang === "my"
                  ? "အလှည့်နံပါတ် ဒေတာများ အစမှ ပြန်စမည် (Reset Queue Data)"
                  : "Reset Queue & Booking Demo Data"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
