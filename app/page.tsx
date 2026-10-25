"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  useClinic,
  generatePatientIdQrDataUrl,
} from "@/lib/clinic-store";
import { Doctor, Booking } from "@/lib/types";
import { formatCurrency, formatPhoneDisplay } from "@/lib/utils";
import {
  enableNotifications,
  ensureBackgroundAlertKeepAlive,
  showLocalNotification,
} from "@/lib/firebase";
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Wallet,
  Upload,
  Bell,
  Sparkles,
  UserCheck,
  Building2,
  AlertTriangle,
  Delete,
  CalendarClock,
  QrCode,
  Download,
  ExternalLink,
  Copy,
  Check,
  MessageSquareHeart,
  Crown,
  XCircle,
  PlusCircle,
} from "lucide-react";

type LoginTabMode = "register_or_phone" | "returning_id";
type PortalView = "doctors" | "checkout" | "tracker";

export default function PatientPortalPage() {
  const {
    lang,
    viewport,
    settings,
    doctors,
    bookings,
    messages,
    currentPatient,
    loginOrRegisterPatient,
    createBooking,
    requestPatientBookingCancel,
  } = useClinic();

  // Zero-SMS-Cost Patient Onboarding & Returning Account Login State
  const [loginMode, setLoginMode] = useState<LoginTabMode>("register_or_phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [patientCodeInput, setPatientCodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Patient ID & QR Card Modal State
  const [showPatientIdModal, setShowPatientIdModal] = useState(false);
  const [isNewAccountCreated, setIsNewAccountCreated] = useState(false);
  const [patientIdQrUrl, setPatientIdQrUrl] = useState<string | null>(null);
  const [copiedPatientCode, setCopiedPatientCode] = useState(false);

  // Portal Navigation State
  const [view, setView] = useState<PortalView>("doctors");
  const [dismissedBookingId, setDismissedBookingId] = useState<string | null>(
    null
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "credit_points" | "kpay" | "wavepay" | "ayapay"
  >("credit_points");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [fallbackQrUrl, setFallbackQrUrl] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  // Find active or today's latest non-cancelled booking for logged-in patient
  const activeBooking: Booking | undefined = useMemo(() => {
    if (!currentPatient) return undefined;
    const patientBookings = bookings.filter(
      (b) =>
        b.patient_id === currentPatient.id &&
        b.status !== "cancelled" &&
        b.status !== "no_show" &&
        b.id !== dismissedBookingId
    );
    // Prioritize waiting or in_progress first, otherwise show most recent completed
    const liveOne = patientBookings.find(
      (b) => b.status === "waiting" || b.status === "in_progress"
    );
    if (liveOne) return liveOne;
    return patientBookings[patientBookings.length - 1];
  }, [bookings, currentPatient, dismissedBookingId]);

  // Support direct booking URL `?doctor=<id>` or returning patient QR `?pid=<code>`
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get("doctor");
    const pidParam = params.get("pid");
    if (pidParam && !currentPatient) {
      setPatientCodeInput(pidParam.trim().toUpperCase());
      setLoginMode("returning_id");
    }
    if (docParam && doctors.some((d) => d.id === docParam)) {
      setSelectedDoctorId(docParam);
      if (currentPatient && !activeBooking) {
        setView("checkout");
      }
    }
  }, [doctors, currentPatient, activeBooking]);

  // Generate permanent Patient ID QR Code for currentPatient
  useEffect(() => {
    if (!currentPatient?.patient_code) {
      setPatientIdQrUrl(null);
      return;
    }
    if (currentPatient.qr_card_url) {
      setPatientIdQrUrl(currentPatient.qr_card_url);
      return;
    }
    generatePatientIdQrDataUrl(currentPatient.patient_code)
      .then(setPatientIdQrUrl)
      .catch(() => setPatientIdQrUrl(null));
  }, [currentPatient]);

  // Automatically switch to live tracker if patient has an active booking
  useEffect(() => {
    if (activeBooking && view !== "checkout") {
      setView("tracker");
    } else if (!activeBooking && view === "tracker") {
      setView("doctors");
    }
  }, [activeBooking, view]);

  const selectedDoctor: Doctor | undefined = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId),
    [doctors, selectedDoctorId]
  );

  // Default payment method selection when opening checkout
  useEffect(() => {
    if (selectedDoctor && currentPatient) {
      if (currentPatient.credit_points >= selectedDoctor.consultation_fee) {
        setPaymentMethod("credit_points");
      } else {
        setPaymentMethod("kpay");
      }
    }
  }, [selectedDoctor, currentPatient]);

  // Generate QR code on client if activeBooking doesn't have qr_image_url cached yet (with embedded Patient ID!)
  useEffect(() => {
    if (!activeBooking) {
      setFallbackQrUrl(null);
      return;
    }
    if (activeBooking.qr_image_url) {
      setFallbackQrUrl(activeBooking.qr_image_url);
      return;
    }
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const ticketCode =
      activeBooking.ticket_code || `Q-${activeBooking.queue_number}`;
    const pidQuery = currentPatient?.patient_code
      ? `&pid=${encodeURIComponent(currentPatient.patient_code)}`
      : "";
    const url = `${origin}/ticket/${activeBooking.id}?code=${ticketCode}${pidQuery}`;
    QRCode.toDataURL(url, {
      width: 340,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setFallbackQrUrl)
      .catch(() => setFallbackQrUrl(null));
  }, [activeBooking, currentPatient]);

  const handlePhoneKeyPress = (digit: string) => {
    setAuthError("");
    if (phoneInput.length < 13) setPhoneInput((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setAuthError("");
    setPhoneInput((prev) => prev.slice(0, -1));
  };

  // Automatically activate background audio/SW keep-alive when patient is logged in
  useEffect(() => {
    if (!currentPatient || typeof window === "undefined") return;
    ensureBackgroundAlertKeepAlive();
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationEnabled(true);
    }
  }, [currentPatient]);

  const handlePatientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoggingIn(true);
    try {
      ensureBackgroundAlertKeepAlive();
      const res = await loginOrRegisterPatient({
        mode: loginMode,
        phone: phoneInput,
        name: nameInput,
        patientCode: patientCodeInput,
      });
      enableNotifications()
        .then((n) => {
          if (n.permission === "granted" || n.token) {
            setNotificationEnabled(true);
          }
        })
        .catch(() => {});

      if (res.isNewAccount) {
        setIsNewAccountCreated(true);
        setShowPatientIdModal(true);
      }
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : lang === "my"
          ? "အကောင့်ဝင်ရောက်ရာတွင် အမှားအယွင်းရှိနေပါသည်။"
          : "Could not sign in. Please check your details."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyPatientCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedPatientCode(true);
    setTimeout(() => setCopiedPatientCode(false), 2000);
  };

  const handleEnablePushNotifications = async () => {
    ensureBackgroundAlertKeepAlive();
    const res = await enableNotifications();
    if (res.permission === "granted" || res.token) {
      setNotificationEnabled(true);
    }
    // Always trigger the loud "တီ — တီ!" alert + OS push notification so the patient can verify it works
    showLocalNotification(
      lang === "my"
        ? "ဖုန်းသတိပေးချက်နှင့် 'တီ-တီ' အသံစနစ် ဖွင့်ထားပြီးပါပြီ"
        : "Phone Push & Sound Alerts Active",
      lang === "my"
        ? "Reception မှ သတိပေးချက်ပို့လျှင် သို့မဟုတ် သင့်အလှည့်နီးလျှင် ဖုန်း Screen ပိတ်ထားသော်လည်း 'တီ' ဟု အသံမြည်၍ သတိပေးပါမည်။"
        : "Even when your phone screen is off, you will hear a beep and receive push notifications from Reception.",
      `clinic-test-alert-${Date.now()}`
    );
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setCheckoutError("");
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !currentPatient) return;
    setCheckoutError("");

    if (
      paymentMethod === "credit_points" &&
      currentPatient.credit_points < selectedDoctor.consultation_fee
    ) {
      setCheckoutError(
        lang === "my"
          ? "သင့်လက်ကျန် Credit Points မလုံလောက်ပါ။ KPay, WavePay သို့မဟုတ် AYA Pay ဖြင့် ပေးချေပေးပါ။"
          : "Insufficient Credit Points. Please choose KPay, WavePay, or AYA Pay."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      setDismissedBookingId(null);
      await createBooking({
        doctorId: selectedDoctor.id,
        paymentMethod,
        receiptFile,
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      setView("tracker");
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not complete booking."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAccountPhone = (phone: string) => {
    navigator.clipboard?.writeText(phone.replace(/[^0-9]/g, ""));
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handlePatientCancelBooking = async (bookingId: string) => {
    try {
      await requestPatientBookingCancel(bookingId);
      setCancelNotice(
        lang === "my"
          ? "ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုချက်ကို Reception သို့ ပေးပို့ပြီးပါပြီ။ Reception မှ အတည်ပြုပြီးမှသာ သင့်အကောင့်ထဲသို့ Credit Points ဝင်ရောက်ပါမည်။"
          : "Your cancellation request has been sent to Reception. Credit Points will be added to your account once Reception confirms."
      );
    } catch (err) {
      setCancelNotice(
        err instanceof Error
          ? err.message
          : lang === "my"
          ? "အလှည့်ရောက်ရန် နီးကပ်နေပြီဖြစ်သဖြင့် ပယ်ဖျက်၍ မရနိုင်တော့ပါ။"
          : "Cannot cancel booking at this stage."
      );
    }
  };

  // ============================================================================
  // 1. ZERO-SMS-COST PATIENT ONBOARDING & RETURNING ID LOGIN SCREEN
  // ============================================================================
  if (!currentPatient) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <div
          className={`grid grid-cols-1 gap-5 ${
            viewport.orientation === "landscape" && viewport.width >= 700
              ? " md:grid-cols-12 md:items-start"
              : "mx-auto max-w-xl"
          }`}
        >
          {/* Hero Welcome Banner with Royal Gradient */}
          <div
            className={`overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-5 text-white shadow-xl sm:p-7 ${
              viewport.orientation === "landscape" && viewport.width >= 700
                ? "md:col-span-5"
                : ""
            }`}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
              <span>
                {lang === "my"
                  ? "SMS ကုန်ကျစရိတ် မရှိသော လူနာ ID စနစ်"
                  : "Zero-SMS Patient ID System"}
              </span>
            </div>
            <h1 className="text-xl font-black leading-snug sm:text-3xl">
              {lang === "my"
                ? `${settings.clinicNameMy} မှ ကြိုဆိုပါသည်`
                : `Welcome to ${settings.clinicName}`}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100 sm:text-base">
              {lang === "my"
                ? "လူနာအမည်နှင့် ဖုန်းနံပါတ် ရိုက်ထည့်ရုံဖြင့် သင့်ကိုယ်ပိုင် လူနာ ID နှင့် QR ကတ်ကို အလိုအလျောက် ထုတ်ပေးပါသည်။ နောက်အခေါက်များတွင် လူနာ ID သို့မဟုတ် ဖုန်းနံပါတ်ဖြင့် အလွယ်တကူ ပြန်ဝင်နိုင်ပါသည်။"
                : "Sign in with your Name & Phone Number to receive your unique Patient ID & QR Card. Returning patients can sign in anytime using their Patient ID."}
            </p>

            <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-3.5 text-xs font-bold text-sky-100 sm:text-sm">
              {lang === "my"
                ? "💡 ဖုန်းနံပါတ် ပြောင်းလဲသွားပါကလည်း မိမိ၏ လူနာ ID နှင့် မှတ်ပုံတင်/ယာဉ်မောင်းလိုင်စင်ကို Reception တွင် ပြသ၍ အကောင့်ဟောင်းနှင့် Credit Points များကို ပြန်လည်ရယူနိုင်ပါသည်။"
                : "💡 Changed your phone number? Show your Patient ID and NRC/Driver's License at Reception to transfer your Credit Points to your new phone."}
            </div>
          </div>

          {/* Login & Returning Patient ID Card */}
          <div
            className={`rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-lg sm:p-7 ${
              viewport.orientation === "landscape" && viewport.width >= 700
                ? "md:col-span-7"
                : ""
            }`}
          >
            {/* Mode Switcher Tabs */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("register_or_phone");
                  setAuthError("");
                }}
                className={`min-h-[48px] rounded-xl px-3 py-2 text-xs font-black transition-all sm:text-sm ${
                  loginMode === "register_or_phone"
                    ? "bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md"
                    : "text-slate-700 hover:bg-white/70"
                }`}
              >
                {lang === "my"
                  ? "၁။ အမည် + ဖုန်းဖြင့် ဝင်မည် (အသစ်/အဟောင်း)"
                  : "1. Name + Phone Sign In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("returning_id");
                  setAuthError("");
                }}
                className={`min-h-[48px] rounded-xl px-3 py-2 text-xs font-black transition-all sm:text-sm ${
                  loginMode === "returning_id"
                    ? "bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md"
                    : "text-slate-700 hover:bg-white/70"
                }`}
              >
                {lang === "my"
                  ? "၂။ လူနာ ID ဖြင့် အကောင့်ဟောင်းဝင်မည်"
                  : "2. Returning Patient ID Login"}
              </button>
            </div>

            <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
              {loginMode === "register_or_phone"
                ? lang === "my"
                  ? "လူနာအမည်နှင့် ဖုန်းနံပါတ် ရိုက်ထည့်ပါ"
                  : "Enter Patient Name & Phone Number"
                : lang === "my"
                ? "လူနာ ID ဖြင့် အကောင့်အဟောင်း ပြန်ဝင်ရန်"
                : "Sign In with Your Patient ID"}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-700 sm:text-base">
              {loginMode === "register_or_phone"
                ? lang === "my"
                  ? "အကောင့်အသစ်ဖြစ်ပါက လူနာ ID အလိုအလျောက် ထုတ်ပေးပါမည်။ အကောင့်ရှိပြီးသားဖြစ်ပါက မူလအကောင့်သို့ တိုက်ရိုက်ဝင်ရောက်ပါမည်။"
                  : "New patients receive an auto-generated Patient ID. Existing phone numbers log right back into your account."
                : lang === "my"
                ? "ယခင်ရရှိထားသော လူနာ ID (ဥပမာ - ASC2610250001) နှင့် အမည် သို့မဟုတ် ဖုန်းနံပါတ်ကို ရိုက်ထည့်ပါ။"
                : "Enter your saved Patient ID (e.g. ASC2610250001) along with your name or phone number."}
            </p>

            <form onSubmit={handlePatientLoginSubmit} className="mt-4 space-y-4">
              {loginMode === "returning_id" && (
                <div>
                  <label className="mb-1.5 block text-sm font-extrabold text-slate-900 sm:text-base">
                    {lang === "my"
                      ? "လူနာ ID နံပါတ် (Patient ID) *"
                      : "Patient ID Code *"}
                  </label>
                  <div className="flex min-h-[58px] items-center gap-3 rounded-2xl border-2 border-emerald-700 bg-emerald-50/50 px-4 py-2 shadow-inner">
                    <QrCode className="h-6 w-6 shrink-0 text-emerald-700" />
                    <input
                      type="text"
                      value={patientCodeInput}
                      onChange={(e) => {
                        setAuthError("");
                        setPatientCodeInput(e.target.value.toUpperCase());
                      }}
                      placeholder="ဥပမာ - ASC2610250001"
                      className="w-full bg-transparent font-mono text-xl font-black uppercase tracking-wider text-slate-950 placeholder:text-slate-400 focus:outline-none sm:text-2xl"
                    />
                  </div>
                </div>
              )}

              {/* Patient Name Input */}
              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-slate-900 sm:text-base">
                  {loginMode === "register_or_phone"
                    ? lang === "my"
                      ? "လူနာအမည် အပြည့်အစုံ *"
                      : "Patient Full Name *"
                    : lang === "my"
                    ? "လူနာအမည် (အတည်ပြုရန်)"
                    : "Patient Name (For Verification)"}
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setAuthError("");
                    setNameInput(e.target.value);
                  }}
                  placeholder={
                    lang === "my"
                      ? "ဥပမာ - ဦးဘလှိုင် / ဒေါ်မြစိန်"
                      : "e.g., U Ba Hlaing / Daw Mya Sein"
                  }
                  className="min-h-[54px] w-full rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 text-lg font-black text-slate-950 placeholder:text-slate-400 focus:border-clinic-primary focus:outline-none"
                />
              </div>

              {/* Mobile Phone Number Field */}
              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-slate-900 sm:text-base">
                  {loginMode === "register_or_phone"
                    ? lang === "my"
                      ? "မိုဘိုင်းဖုန်းနံပါတ် *"
                      : "Mobile Phone Number *"
                    : lang === "my"
                    ? "ဖုန်းနံပါတ် (မှတ်မိပါက ထည့်သွင်းရန်)"
                    : "Mobile Phone Number (Optional if Name matches)"}
                </label>
                <div className="flex min-h-[60px] items-center gap-3 rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 py-2 shadow-inner">
                  <Phone className="h-6 w-6 shrink-0 text-clinic-primary" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setAuthError("");
                      setPhoneInput(e.target.value.replace(/[^0-9+]/g, ""));
                    }}
                    placeholder={
                      lang === "my" ? "09..." : "Enter phone number..."
                    }
                    className="w-full bg-transparent text-2xl font-black tracking-wider text-slate-950 placeholder:text-slate-400 focus:outline-none sm:text-3xl"
                  />
                </div>
              </div>

              {/* Elderly-Friendly Tactile Dial Pad for Phone Number */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePhoneKeyPress(digit)}
                    className="dialpad-btn flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 text-2xl font-black text-slate-950 shadow-sm active:scale-95 active:bg-slate-200 sm:min-h-[56px]"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPhoneInput("")}
                  className="dialpad-btn flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-100 text-xs font-extrabold text-slate-800 active:scale-95 sm:min-h-[56px] sm:text-sm"
                >
                  {lang === "my" ? "ဖုန်းဖျက်" : "CLEAR"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePhoneKeyPress("0")}
                  className="dialpad-btn flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 text-2xl font-black text-slate-950 shadow-sm active:scale-95 active:bg-slate-200 sm:min-h-[56px]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Delete last digit"
                  className="dialpad-btn flex min-h-[52px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-100 text-slate-900 active:scale-95 sm:min-h-[56px]"
                >
                  <Delete className="h-6 w-6" />
                </button>
              </div>

              {authError && (
                <div className="rounded-2xl border-2 border-red-700 bg-red-50 p-3.5 text-sm font-extrabold text-red-900 sm:text-base">
                  {authError}
                </div>
              )}

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-3.5 text-lg font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99] sm:min-h-[64px] sm:text-xl"
              >
                <span>
                  {isLoggingIn
                    ? lang === "my"
                      ? "ချိတ်ဆက်နေပါသည်..."
                      : "Signing In..."
                    : loginMode === "register_or_phone"
                    ? lang === "my"
                      ? "အကောင့်ဝင်မည် / လူနာ ID ရယူမည်"
                      : "Sign In / Get Patient ID"
                    : lang === "my"
                    ? "လူနာ ID ဖြင့် အကောင့်အဟောင်း ဝင်မည်"
                    : "Sign In with Patient ID"}
                </span>
                <ArrowRight className="h-6 w-6 shrink-0" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const patientIdCardModalElement = showPatientIdModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-slate-300 bg-white shadow-2xl">
        {/* Royal Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-5 text-white sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-300">
                <QrCode className="h-3.5 w-3.5" />
                {isNewAccountCreated
                  ? lang === "my"
                    ? "လူနာအကောင့်သစ် ဖွင့်လှစ်ပြီးပါပြီ"
                    : "New Patient Account Created"
                  : lang === "my"
                  ? "တရားဝင် လူနာသက်သေခံ ID နှင့် QR ကတ်"
                  : "Official Digital Patient ID & QR Card"}
              </span>
              <h2 className="mt-2 text-xl font-black sm:text-2xl">
                {lang === "my"
                  ? settings.clinicNameMy
                  : settings.clinicName}
              </h2>
              <p className="text-xs font-bold text-blue-100 sm:text-sm">
                {currentPatient.name} • {formatPhoneDisplay(currentPatient.phone)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPatientIdModal(false);
                setIsNewAccountCreated(false);
              }}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black text-white hover:bg-white/25"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {/* Critical Warning to Write Down or Screenshot */}
          <div className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
              <div className="text-xs font-extrabold leading-relaxed sm:text-sm">
                {lang === "my"
                  ? "အရေးကြီးပါသည် — သင့်လူနာ ID နံပါတ်ကို စာရွက်တွင် ချရေးထားပါ သို့မဟုတ် ဤစာမျက်နှာကို Screenshot ရိုက်၍ သိမ်းဆည်းထားပါ။ နောင်တွင် ဖုန်းနံပါတ်ပြောင်းလဲပါက လက်ကျန် Credit Points များ ပြန်လည်ရယူရန် ဤ ID နှင့် မှတ်ပုံတင်/ယာဉ်မောင်းလိုင်စင်ကို Reception တွင် ပြသရပါမည်။"
                  : "IMPORTANT: Please write down your Patient ID or take a Screenshot of this card. If you ever change your phone number, you will need this Patient ID and your NRC/Driver's License at Reception to recover your Credit Points."}
              </div>
            </div>
          </div>

          {/* Massive Patient ID Badge + Copy */}
          <div className="rounded-2xl border-2 border-indigo-700 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 text-center shadow-sm">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900">
              {lang === "my"
                ? "သင့်ကိုယ်ပိုင် လူနာ ID နံပါတ် (Patient ID)"
                : "Your Unique Patient ID"}
            </span>
            <p className="my-1.5 font-mono text-2xl font-black tracking-wider text-slate-950 sm:text-3xl">
              {currentPatient.patient_code}
            </p>
            <button
              type="button"
              onClick={() => handleCopyPatientCode(currentPatient.patient_code)}
              className="mt-1 inline-flex min-h-[42px] items-center gap-2 rounded-xl border-2 border-indigo-700 bg-white px-4 py-1.5 text-xs font-black text-indigo-900 hover:bg-indigo-50 sm:text-sm"
            >
              {copiedPatientCode ? (
                <>
                  <Check className="h-4 w-4 text-emerald-700" />
                  <span>{lang === "my" ? "ID ကူးယူပြီးပါပြီ" : "ID Copied!"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>{lang === "my" ? "လူနာ ID ကူးယူမည်" : "Copy Patient ID"}</span>
                </>
              )}
            </button>
          </div>

          {/* Permanent Patient QR Code */}
          <div className="flex flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
            {patientIdQrUrl ? (
              <img
                src={patientIdQrUrl}
                alt={`Patient QR ${currentPatient.patient_code}`}
                className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2 object-contain"
              />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white">
                <QrCode className="h-16 w-16 text-slate-400" />
              </div>
            )}
            <span className="mt-2 font-mono text-sm font-black text-slate-900">
              ID: {currentPatient.patient_code}
            </span>
            <p className="mt-1 text-center text-xs font-bold text-slate-600">
              {lang === "my"
                ? "Reception ကောင်တာတွင် ဤ QR ကို Scan ဖတ်၍ သင့်အကောင့်နှင့် ပွိုင့်များကို ချက်ချင်း ရှာဖွေနိုင်ပါသည်။"
                : "Reception can scan this QR code to instantly find your profile and Credit Points."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {patientIdQrUrl && (
              <a
                href={patientIdQrUrl}
                download={`Patient-ID-${currentPatient.patient_code}.png`}
                className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-blue-700 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-950 hover:bg-blue-100"
              >
                <Download className="h-4 w-4" />
                <span>
                  {lang === "my" ? "QR ကတ်ပုံ သိမ်းမည်" : "Download QR Card"}
                </span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setShowPatientIdModal(false);
                setIsNewAccountCreated(false);
              }}
              className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-2.5 text-sm font-black text-white shadow-md hover:opacity-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {lang === "my"
                  ? "မှတ်သားပြီးပါပြီ (ဆက်လက်လုပ်ဆောင်မည်)"
                  : "Got It, Continue"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ============================================================================
  // 2. LIVE QUEUE TRACKER VIEW (REAL-TIME 3 -> 4 -> 5 SYNC)
  // ============================================================================
  if (view === "tracker" && activeBooking) {
    const doctor = doctors.find((d) => d.id === activeBooking.doctor_id);
    const currentServing = doctor?.current_queue_number ?? 0;
    const isDoctorNotArrived =
      doctor?.status === "not_arrived" || currentServing === 0;
    const myQueueNumber = activeBooking.queue_number;
    const patientsAhead = isDoctorNotArrived
      ? Math.max(0, myQueueNumber - 1)
      : Math.max(0, myQueueNumber - currentServing);
    const isMyTurn = !isDoctorNotArrived && myQueueNumber === currentServing;
    const isPassedOrCompleted =
      (!isDoctorNotArrived && myQueueNumber < currentServing) ||
      activeBooking.status === "completed";
    const isApproaching =
      !isDoctorNotArrived &&
      !isPassedOrCompleted &&
      patientsAhead > 0 &&
      patientsAhead <= 3;
    const avgMins = doctor?.avg_consult_minutes || 8;
    const estimatedWaitMinutes =
      patientsAhead * avgMins + (doctor?.delay_minutes || 0);
    const ticketCode =
      activeBooking.ticket_code || `Q-${activeBooking.queue_number}`;

    // Messages for this doctor or this patient
    const relevantMessages = messages.filter(
      (m) =>
        (!m.doctor_id || m.doctor_id === activeBooking.doctor_id) &&
        (!m.patient_id || m.patient_id === currentPatient.id)
    );

    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:px-6 sm:py-8">
        {patientIdCardModalElement}
        {/* Top Patient Welcome & Status Bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                {lang === "my" ? "လူနာအမည်" : "Patient"}
              </p>
              <span className="rounded-lg bg-indigo-950 px-2.5 py-0.5 font-mono text-xs font-black text-amber-300">
                ID: {currentPatient.patient_code}
              </span>
            </div>
            <h1 className="truncate text-lg font-black text-slate-950 sm:text-xl">
              {currentPatient.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPatientIdModal(true)}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border-2 border-indigo-700 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-950 hover:bg-indigo-100 sm:text-sm"
            >
              <QrCode className="h-4 w-4 text-indigo-700" />
              <span>
                {lang === "my" ? "လူနာ ID နှင့် QR ကတ်" : "Patient ID & QR"}
              </span>
            </button>
            {activeBooking.is_priority && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-950">
                <Crown className="h-4 w-4 text-amber-600" />
                {lang === "my" ? "ဦးစားပေး (VIP)" : "Priority VIP"}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black sm:text-sm ${
                activeBooking.payment_status === "paid"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                  : "border-amber-600 bg-amber-50 text-amber-950"
              }`}
            >
              {activeBooking.payment_status === "paid" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>
                    {lang === "my"
                      ? "ငွေပေးချေပြီး (အတည်ပြုပြီး)"
                      : "Paid & Confirmed"}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    {lang === "my"
                      ? "ငွေလွှဲပြေစာ စစ်ဆေးနေဆဲ"
                      : "Verifying Payment Receipt"}
                  </span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => setView("doctors")}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-200 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4 text-clinic-primary" />
              <span>
                {lang === "my" ? "ဆရာဝန်စာရင်း" : "All Doctors"}
              </span>
            </button>
          </div>
        </div>

        {/* Doctor Not Arrived / Postponed / Delayed Status Banner */}
        {doctor && doctor.status !== "available" && (
          <div
            className={`mb-5 rounded-3xl border-4 p-4 shadow-md sm:p-5 ${
              doctor.status === "postponed"
                ? "border-red-700 bg-gradient-to-r from-red-50 to-rose-100 text-red-950"
                : doctor.status === "not_arrived"
                ? "border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-100 text-blue-950"
                : "border-amber-600 bg-gradient-to-r from-amber-50 to-orange-100 text-amber-950"
            }`}
          >
            <div className="flex items-start gap-3">
              {doctor.status === "not_arrived" ? (
                <Clock className="h-7 w-7 shrink-0 text-blue-700" />
              ) : (
                <AlertTriangle className="h-7 w-7 shrink-0" />
              )}
              <div>
                <h2 className="text-lg font-black sm:text-xl">
                  {doctor.status === "postponed"
                    ? lang === "my"
                      ? "ဆရာဝန်ကြီး ယနေ့ ရက်ချိန်း ရွှေ့ဆိုင်းထားပါသည်"
                      : "Doctor Session Postponed"
                    : doctor.status === "not_arrived"
                    ? lang === "my"
                      ? "ဆရာဝန်ကြီး မရောက်ရှိသေးပါ (ကြိုတင်အလှည့်နံပါတ် ရယူထားပြီးဖြစ်ပါသည်)"
                      : "Doctor Has Not Arrived Yet (Your Queue Slot is Reserved)"
                    : lang === "my"
                    ? `ဆရာဝန်ကြီး ${doctor.delay_minutes} မိနစ်ခန့် နောက်ကျမည်ဖြစ်ပါသည်`
                    : `Doctor Delayed by ${doctor.delay_minutes} Minutes`}
                </h2>
                <p className="mt-1 text-sm font-bold sm:text-base">
                  {doctor.status === "postponed"
                    ? lang === "my"
                      ? `ပြန်လည်ချိန်းဆိုသည့်ရက် - ${
                          doctor.postponed_to || "ထပ်မံအကြောင်းကြားပါမည်"
                        }`
                      : `Rescheduled Date: ${doctor.postponed_to || "TBA"}`
                    : doctor.status === "not_arrived"
                    ? lang === "my"
                      ? "ဆရာဝန်ကြီး ဆေးခန်းသို့ ရောက်ရှိသည်နှင့် အလှည့်နံပါတ် (#1) မှ စတင်ပြသမည်ဖြစ်ပြီး သင့်ဖုန်းသို့ ချက်ချင်း အကြောင်းကြားပေးပါမည်။"
                      : "As soon as the doctor arrives, Queue #1 will begin and you will receive a live notification."
                    : doctor.status_note ||
                      (lang === "my"
                        ? "အရေးပေါ်လူနာ ကြည့်ရှုနေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။"
                        : "Please wait comfortably; the queue will resume shortly.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Smart ETA Approaching / Turn Now / Completed Banner */}
        {(isMyTurn || isApproaching || isPassedOrCompleted) && (
          <div
            className={`mb-5 rounded-3xl border-4 p-4 text-white shadow-xl sm:p-5 ${
              isMyTurn
                ? "border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800"
                : isApproaching
                ? "border-amber-300 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800"
                : "border-slate-400 bg-gradient-to-r from-slate-700 to-slate-900"
            }`}
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3.5">
                <Bell
                  className={`h-8 w-8 shrink-0 ${
                    isMyTurn || isApproaching ? "animate-bounce" : ""
                  }`}
                />
                <div>
                  <h2 className="text-lg font-black sm:text-2xl">
                    {isMyTurn
                      ? lang === "my"
                        ? "သင့်အလှည့် ရောက်ပါပြီ! အခန်းထဲသို့ ဝင်ရောက်နိုင်ပါပြီ"
                        : "IT IS YOUR TURN NOW!"
                      : isApproaching
                      ? lang === "my"
                        ? `သင့်အလှည့် ရောက်ရန် လူနာ (${patientsAhead}) ဦးသာ လိုပါတော့သည်!`
                        : `YOUR TURN IS APPROACHING (${patientsAhead} Patients Away)`
                      : lang === "my"
                      ? `သင့်အလှည့် (#${myQueueNumber}) ပြီးဆုံးသွားပါပြီ (ယခု #${currentServing} ကို ပြသနေပါသည်)`
                      : `Your Queue (#${myQueueNumber}) is Completed (Now Serving #${currentServing})`}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-white/95 sm:text-base">
                    {isMyTurn
                      ? lang === "my"
                        ? `ကျေးဇူးပြု၍ အခန်းအမှတ် (${doctor?.room_number}) - ${doctor?.name_my} ထံသို့ ယခုပင် ဝင်ရောက်ပေးပါ။`
                        : `Please enter Room ${doctor?.room_number} (${doctor?.name}) immediately.`
                      : isApproaching
                      ? lang === "my"
                        ? `ဆေးခန်းသို့ ကြွရောက်ပေးပါရန်နှင့် အခန်း (${doctor?.room_number}) ရှေ့တွင် အသင့်စောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။`
                        : `Please proceed to the clinic and wait near Room ${doctor?.room_number}.`
                      : lang === "my"
                      ? "နောက်ထပ် ဆရာဝန် ရက်ချိန်းအသစ် ရယူလိုပါက အောက်ပါခလုတ်ကို နှိပ်ပါ။"
                      : "You may book another appointment whenever needed."}
                  </p>
                </div>
              </div>

              {isPassedOrCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    setDismissedBookingId(activeBooking.id);
                    setView("doctors");
                  }}
                  className="shrink-0 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-md hover:bg-slate-100"
                >
                  {lang === "my"
                    ? "ရက်ချိန်းအသစ် ထပ်ယူမည်"
                    : "Book New Queue"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Massive Color-Coded Live Queue Comparison Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Clinic's Current Queue Number */}
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-800 p-5 text-center text-white shadow-lg sm:p-6">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300 sm:text-sm">
              {lang === "my"
                ? "ယခု ပြသနေသော အလှည့်နံပါတ်"
                : "Now Serving in Clinic"}
            </span>
            <span className="queue-number-fluid my-2 font-black tracking-tighter text-white">
              {isDoctorNotArrived
                ? lang === "my"
                  ? "မစသေးပါ"
                  : "Waiting"
                : `#${currentServing}`}
            </span>
            <span className="rounded-xl bg-white/15 px-3.5 py-1 text-xs font-bold text-slate-100 sm:text-sm">
              {isDoctorNotArrived
                ? lang === "my"
                  ? "ဆရာဝန်ရောက်လျှင် #1 စတင်ပါမည်"
                  : "Starts at #1 when doctor arrives"
                : lang === "my"
                ? `အခန်း (${doctor?.room_number}) • ${doctor?.name_my}`
                : `Room ${doctor?.room_number} • ${doctor?.name}`}
            </span>
          </div>

          {/* Patient's Assigned Queue Number */}
          <div
            className={`flex flex-col items-center justify-center rounded-3xl border-4 p-5 text-center text-white shadow-xl sm:p-6 ${
              isMyTurn
                ? "border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-800"
                : isApproaching
                ? "border-amber-300 bg-gradient-to-br from-amber-500 to-orange-700"
                : isPassedOrCompleted
                ? "border-slate-400 bg-gradient-to-br from-slate-700 to-slate-900"
                : "border-blue-400 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900"
            }`}
          >
            <span className="text-xs font-extrabold uppercase tracking-wider text-white/90 sm:text-sm">
              {lang === "my" ? "သင့်အလှည့် နံပါတ်" : "Your Queue Number"}
            </span>
            <span className="queue-number-fluid my-2 font-black tracking-tighter">
              #{myQueueNumber}
            </span>
            <span className="rounded-xl bg-black/25 px-3.5 py-1 text-xs font-extrabold sm:text-sm">
              {isMyTurn
                ? lang === "my"
                  ? "အခန်းအမှတ် " + doctor?.room_number + " သို့ ဝင်ပါ"
                  : `Enter Room ${doctor?.room_number} Now`
                : isPassedOrCompleted
                ? lang === "my"
                  ? "သင့်အလှည့် ပြီးဆုံးသွားပါပြီ"
                  : "Turn Completed"
                : lang === "my"
                ? `သင့်ရှေ့တွင် လူနာ (${patientsAhead}) ဦး ကျန်ပါသည်`
                : `${patientsAhead} patient(s) ahead of you`}
            </span>
          </div>
        </div>

        {/* Doctor & Estimated Wait Card */}
        <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md sm:p-6">
          <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-wider text-clinic-primary">
                {lang === "my"
                  ? doctor?.specialty_my || doctor?.specialty
                  : doctor?.specialty}
              </span>
              <h3 className="text-xl font-black text-slate-950 sm:text-2xl">
                {lang === "my" ? doctor?.name_my || doctor?.name : doctor?.name}
              </h3>
              <p className="mt-0.5 text-sm font-bold text-slate-600">
                {lang === "my"
                  ? `ကြည့်ရှုချိန် - ${doctor?.start_time} မှ ${doctor?.end_time}`
                  : `Consultation Hours: ${doctor?.start_time} – ${doctor?.end_time}`}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-2.5 text-sm font-black text-white shadow-sm sm:text-base">
              <Building2 className="h-5 w-5 shrink-0" />
              <span>
                {lang === "my"
                  ? `အခန်းအမှတ် ${doctor?.room_number}`
                  : `Room ${doctor?.room_number}`}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4">
              <Clock className="h-8 w-8 shrink-0 text-clinic-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {lang === "my"
                    ? "ခန့်မှန်း စောင့်ဆိုင်းရမည့်အချိန်"
                    : "Estimated Wait Time"}
                </p>
                <p className="text-lg font-black text-slate-950 sm:text-xl">
                  {isMyTurn
                    ? lang === "my"
                      ? "၀ မိနစ် (ယခုဝင်ပါ)"
                      : "0 mins (Now Serving)"
                    : isPassedOrCompleted
                    ? lang === "my"
                      ? "ပြီးဆုံး"
                      : "Completed"
                    : lang === "my"
                    ? `~ ${estimatedWaitMinutes} မိနစ်ခန့်`
                    : `~ ${estimatedWaitMinutes} Minutes`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnablePushNotifications}
              className={`flex min-h-[56px] items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-sm font-extrabold transition-all sm:text-base ${
                notificationEnabled
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                  : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Bell className="h-5 w-5 shrink-0" />
              <span>
                {notificationEnabled
                  ? lang === "my"
                    ? "အသိပေးချက် ဖွင့်ထားပြီး ('တီ' အသံစမ်းသပ်ရန် နှိပ်ပါ)"
                    : "Push & Sound Active (Tap to Test Beep)"
                  : lang === "my"
                  ? "ဖုန်းသတိပေးချက်နှင့် 'တီ' အသံစနစ် ဖွင့်မည် (Screen Off ပါမြည်သည်)"
                  : "Enable Push & 'Beep' Alerts (Works Screen Off)"}
              </span>
            </button>
          </div>
        </div>

        {/* Live Doctor Broadcast & Automated Messages Feed */}
        <div className="mt-5 rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 p-5 shadow-md sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquareHeart className="h-6 w-6 shrink-0 text-clinic-primary" />
              <h3 className="text-base font-black text-slate-950 sm:text-xl">
                {lang === "my"
                  ? "ဆေးခန်းနှင့် ဆရာဝန်ကြီးမှ တိုက်ရိုက် အသိပေးချက်များ"
                  : "Live Doctor & Clinic Updates"}
              </h3>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900">
              {relevantMessages.length}
            </span>
          </div>

          {relevantMessages.length === 0 ? (
            <p className="text-sm font-bold text-slate-600 sm:text-base">
              {lang === "my"
                ? "လက်ရှိတွင် ထူးခြားသော အသိပေးချက် မရှိသေးပါ။"
                : "No special announcements right now."}
            </p>
          ) : (
            <div className="space-y-3">
              {relevantMessages.slice(0, 5).map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-slate-950 sm:text-base">
                      {lang === "my" ? msg.title_my : msg.title_en}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800 sm:text-base">
                    {lang === "my" ? msg.body_my : msg.body_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digital QR Code Queue Ticket Card */}
        <div className="mt-5 rounded-3xl border-2 border-slate-300 bg-white p-5 shadow-md sm:p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
              {fallbackQrUrl ? (
                <img
                  src={fallbackQrUrl}
                  alt={`QR Ticket ${ticketCode}`}
                  className="h-40 w-40 rounded-xl object-contain sm:h-44 sm:w-44"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44">
                  <QrCode className="h-16 w-16 text-slate-400" />
                </div>
              )}
              <span className="mt-1.5 font-mono text-sm font-black text-slate-900">
                {ticketCode}
              </span>
              <span className="mt-0.5 rounded-md bg-indigo-950 px-2 py-0.5 font-mono text-[11px] font-black text-amber-300">
                ID: {currentPatient.patient_code}
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-950">
                <QrCode className="h-3.5 w-3.5" />
                <span>
                  {lang === "my"
                    ? "ဒစ်ဂျစ်တယ် QR အလှည့်လက်မှတ်"
                    : "Digital QR Queue Pass"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-black text-slate-950 sm:text-xl">
                {lang === "my"
                  ? "ဆေးခန်းရောက်လျှင် ဤ QR ကုဒ်ကို ပြသပါ"
                  : "Show This QR Ticket at Reception"}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-700 sm:text-base">
                {lang === "my"
                  ? "ဤ QR ပုံကို ဖုန်းထဲတွင် သိမ်းဆည်းထားနိုင်သလို မိသားစုဝင်များထံ Viber / Messenger မှတစ်ဆင့် ပေးပို့ထားနိုင်ပါသည်။"
                  : "Download this QR pass to your phone gallery or share the live ticket link with family members."}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:justify-start">
                {fallbackQrUrl && (
                  <a
                    href={fallbackQrUrl}
                    download={`Clinic-Ticket-${ticketCode}.png`}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:opacity-95"
                  >
                    <Download className="h-4 w-4" />
                    <span>
                      {lang === "my" ? "QR ပုံ သိမ်းဆည်းမည်" : "Download QR"}
                    </span>
                  </a>
                )}
                <Link
                  href={`/ticket/${activeBooking.id}`}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>
                    {lang === "my"
                      ? "လက်မှတ်စာမျက်နှာ သီးသန့်ဖွင့်မည်"
                      : "Open Shareable Ticket"}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Strict Credit Point Cancellation Policy Card (2-Patients-Ahead Rule + Reception Confirmation Required) */}
        <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
          {cancelNotice && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-2 border-blue-700 bg-blue-50 p-3.5 text-sm font-extrabold text-blue-950">
              <span>{cancelNotice}</span>
              <button
                type="button"
                onClick={() => setCancelNotice(null)}
                className="shrink-0 rounded-lg border border-blue-700 px-2.5 py-1 text-xs font-black"
              >
                OK
              </button>
            </div>
          )}

          {activeBooking.cancel_requested ? (
            <div className="rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <h4 className="text-base font-black sm:text-lg">
                    {lang === "my"
                      ? "ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုချက် ပေးပို့ထားပြီးပါပြီ (Reception အတည်ပြုချက် စောင့်ဆိုင်းနေဆဲ)"
                      : "Cancellation Requested (Waiting for Reception Confirmation)"}
                  </h4>
                  <p className="mt-1 text-sm font-bold text-amber-900">
                    {lang === "my"
                      ? "ဆေးခန်း Reception ကောင်တာမှ သင့်တောင်းဆိုချက်ကို စစ်ဆေးအတည်ပြုပြီးမှသာ စမ်းသပ်ခ ပွိုင့် (Credit Points) များ သင့်အကောင့်ထဲသို့ ဝင်ရောက်ပါမည်။"
                      : "Your Credit Points will be credited to your account once Reception reviews and confirms your cancellation request."}
                  </p>
                </div>
              </div>
            </div>
          ) : activeBooking.status === "waiting" &&
            myQueueNumber - currentServing >= 2 ? (
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {lang === "my"
                    ? "ယနေ့ မလာရောက်နိုင်တော့ပါက ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုနိုင်ပါသည်"
                    : "Need to Cancel Today's Visit?"}
                </h4>
                <p className="mt-0.5 text-sm font-bold text-slate-600">
                  {lang === "my"
                    ? "သင့်အလှည့်မရောက်မီ အနည်းဆုံး လူနာ (၂) ဦး အလိုတွင်သာ ပယ်ဖျက်ခွင့်ရှိပြီး၊ Reception မှ အတည်ပြုပြီးမှသာ သင့်အကောင့်ထဲသို့ Credit Points ပြန်ဝင်ပါမည်။"
                    : "You may request cancellation when at least 2 patients are ahead of you. Credit Points are added after Reception confirms."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePatientCancelBooking(activeBooking.id)}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-red-700 bg-white px-4 py-2.5 text-sm font-black text-red-800 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                <span>
                  {lang === "my"
                    ? "ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုမည်"
                    : "Request Cancellation"}
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-slate-300 bg-slate-100 p-4 text-slate-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-slate-600" />
                <div>
                  <h4 className="text-sm font-black sm:text-base">
                    {lang === "my"
                      ? "ရက်ချိန်းပယ်ဖျက်၍ မရနိုင်တော့ပါ (အနည်းဆုံး လူနာ ၂ ဦး အလိုတွင်သာ ပယ်ဖျက်နိုင်ပါသည်)"
                      : "Cancellation Locked (Requires At Least 2 Patients Ahead)"}
                  </h4>
                  <p className="mt-1 text-xs font-bold text-slate-600 sm:text-sm">
                    {lang === "my"
                      ? "စည်းကမ်းချက်အရ မိမိအလှည့်ရောက်ရန် အနည်းဆုံး (၂) ယောက်အလို မတိုင်မီတွင်သာ ပယ်ဖျက်ခွင့်ရှိပါသည်။ ပြခါနီးအချိန် သို့မဟုတ် မိမိနံပါတ် ကျော်သွားပြီးမှ ပယ်ဖျက်၍ ပွိုင့်ပြန်ယူခြင်း မပြုလုပ်နိုင်ပါ။"
                      : "Per clinic policy, cancellations must be requested at least 2 turns before your queue number. Near-turn or passed numbers cannot be canceled."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. PRE-PAID CHECKOUT WIZARD (1-CLICK CREDIT POINTS OR KPAY/WAVEPAY/AYAPAY)
  // ============================================================================
  if (view === "checkout" && selectedDoctor) {
    const canUseCredits =
      currentPatient.credit_points >= selectedDoctor.consultation_fee;
    const selectedAccount =
      paymentMethod === "kpay"
        ? settings.paymentAccounts.kpay
        : paymentMethod === "wavepay"
        ? settings.paymentAccounts.wavepay
        : settings.paymentAccounts.ayapay;

    return (
      <div className="mx-auto w-full max-w-xl px-3 py-5 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => setView("doctors")}
          className="mb-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm hover:bg-slate-100 sm:text-base"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>
            {lang === "my"
              ? "ဆရာဝန်စာရင်းသို့ ပြန်သွားမည်"
              : "Back to Doctors List"}
          </span>
        </button>

        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-xl">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-5 text-white sm:p-6">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
              {lang === "my"
                ? "အဆင့် (၂) • အလှည့်နံပါတ် အတည်ပြုရယူရန်"
                : "Step 2 • Secure Your Queue Number"}
            </span>
            <h1 className="mt-1 text-xl font-black sm:text-3xl">
              {lang === "my"
                ? selectedDoctor.name_my || selectedDoctor.name
                : selectedDoctor.name}
            </h1>
            <p className="mt-1 text-sm font-bold text-blue-100 sm:text-base">
              {lang === "my"
                ? `${selectedDoctor.specialty_my} • အခန်း (${selectedDoctor.room_number})`
                : `${selectedDoctor.specialty} • Room ${selectedDoctor.room_number}`}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <span className="text-sm font-extrabold sm:text-base">
                {lang === "my" ? "ကြိုတင်စမ်းသပ်ခ" : "Consultation Fee"}
              </span>
              <span className="text-xl font-black text-emerald-300 sm:text-2xl">
                {formatCurrency(selectedDoctor.consultation_fee, lang)}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <h2 className="mb-3 text-base font-black text-slate-950 sm:text-lg">
              {lang === "my"
                ? "ငွေပေးချေမည့် နည်းလမ်းကို ရွေးချယ်ပါ"
                : "Select Payment Method"}
            </h2>

            <div className="space-y-3">
              {/* OPTION A: 1-Click Credit Points */}
              <button
                type="button"
                onClick={() => setPaymentMethod("credit_points")}
                className={`flex min-h-[72px] w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                  paymentMethod === "credit_points"
                    ? "border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 ring-4 ring-emerald-600/20"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-slate-950 sm:text-lg">
                        {lang === "my"
                          ? "၁-ချက်နှိပ် Credit Points ဖြင့် ပေးချေမည်"
                          : "1-Click Credit Points"}
                      </span>
                      {canUseCredits && (
                        <span className="rounded-lg bg-emerald-700 px-2 py-0.5 text-xs font-black text-white">
                          {lang === "my" ? "အမြန်ဆုံး" : "INSTANT"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-700 sm:text-sm">
                      {lang === "my"
                        ? `သင့်လက်ကျန်ပွိုင့် - ${formatCurrency(
                            currentPatient.credit_points,
                            "my"
                          )}`
                        : `Available Balance: ${formatCurrency(
                            currentPatient.credit_points,
                            "en"
                          )}`}
                    </p>
                  </div>
                </div>
                <div
                  className={`h-6 w-6 shrink-0 rounded-full border-2 ${
                    paymentMethod === "credit_points"
                      ? "border-emerald-700 bg-emerald-700"
                      : "border-slate-400"
                  }`}
                />
              </button>

              {/* OPTION B: Mobile Wallet Transfers (KBZPay, WavePay, AYA Pay) */}
              <div className="grid grid-cols-3 gap-2">
                {(["kpay", "wavepay", "ayapay"] as const).map((method) => {
                  const labels = {
                    kpay: {
                      title: "KBZPay",
                      color: "from-blue-600 to-blue-800",
                    },
                    wavepay: {
                      title: "WavePay",
                      color: "from-amber-500 to-yellow-600",
                    },
                    ayapay: {
                      title: "AYA Pay",
                      color: "from-rose-600 to-red-800",
                    },
                  }[method];

                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex min-h-[60px] flex-col items-center justify-center rounded-2xl border-2 p-2.5 text-center transition-all ${
                        isSelected
                          ? "border-blue-700 bg-blue-50 ring-4 ring-blue-600/20"
                          : "border-slate-300 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`inline-block rounded-lg bg-gradient-to-r ${labels.color} px-2.5 py-1 text-xs font-black text-white`}
                      >
                        {labels.title}
                      </span>
                      <span className="mt-1 text-[11px] font-bold text-slate-700">
                        {lang === "my" ? "ပြေစာပုံတင်ရန်" : "Upload Slip"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Payment Instructions */}
            {paymentMethod === "credit_points" ? (
              <div className="mt-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4">
                {canUseCredits ? (
                  <p className="text-sm font-bold text-emerald-950 sm:text-base">
                    {lang === "my"
                      ? `ပြေစာပုံ တင်ရန်မလိုပါ။ သင့် Credit Points မှ ${formatCurrency(
                          selectedDoctor.consultation_fee,
                          "my"
                        )} နှုတ်ယူ၍ အလှည့်နံပါတ် ရယူပေးမည်ဖြစ်ပြီး၊ ဆေးခန်း Reception မှ စစ်ဆေးအတည်ပြုပေးပါမည်။`
                      : `No screenshot needed! ${formatCurrency(
                          selectedDoctor.consultation_fee,
                          "en"
                        )} will be deducted from your Credit Points and Reception will confirm your booking.`}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber-950 sm:text-base">
                    {lang === "my"
                      ? "သင့်တွင် Credit Points မလုံလောက်သေးပါ။ ကျေးဇူးပြု၍ KPay, WavePay သို့မဟုတ် AYA Pay ကို ရွေးချယ်ပေးပါ။"
                      : "Insufficient Credit Points. Please select KBZPay, WavePay, or AYA Pay above."}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="rounded-2xl border-2 border-blue-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        {selectedAccount.provider} Account
                      </span>
                      <p className="text-xl font-black text-slate-950">
                        {selectedAccount.accountNumber}
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {selectedAccount.accountName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyAccountPhone(selectedAccount.accountNumber)
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-blue-700 bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-900 hover:bg-blue-100 sm:text-sm"
                    >
                      {copiedPhone ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-700" />
                          <span>
                            {lang === "my" ? "ကူးယူပြီး" : "Copied!"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>
                            {lang === "my"
                              ? "ဖုန်းနံပါတ် ကူးမည်"
                              : "Copy Number"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-900 sm:text-base">
                    {lang === "my"
                      ? "ငွေလွှဲပြေစာ (Screenshot) ပုံ တင်ပေးပါ"
                      : "Upload Transfer Screenshot"}
                  </label>
                  <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-600 bg-white p-4 text-center hover:bg-blue-50/40">
                    <Upload className="mb-2 h-7 w-7 text-clinic-primary" />
                    <span className="text-sm font-black text-slate-950 sm:text-base">
                      {receiptFile
                        ? receiptFile.name
                        : lang === "my"
                        ? "ပြေစာပုံ ရွေးချယ်ရန် ဤနေရာကို နှိပ်ပါ"
                        : "Tap Here to Choose Screenshot"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {receiptPreview && (
                  <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-2">
                    <img
                      src={receiptPreview}
                      alt="Uploaded Receipt Preview"
                      className="mx-auto max-h-56 rounded-xl object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {checkoutError && (
              <div className="mt-4 rounded-2xl border-2 border-red-700 bg-red-50 p-4 text-sm font-extrabold text-red-900 sm:text-base">
                {checkoutError}
              </div>
            )}

            {/* Single Primary CTA */}
            <button
              type="button"
              disabled={
                isSubmitting ||
                (paymentMethod === "credit_points" && !canUseCredits)
              }
              onClick={handleConfirmBooking}
              className="mt-6 flex min-h-[58px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-lg font-black text-white shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[64px] sm:text-xl"
            >
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <span>
                {isSubmitting
                  ? lang === "my"
                    ? "အလှည့်နံပါတ် ရယူနေပါသည်..."
                    : "Securing Queue Number..."
                  : paymentMethod === "credit_points"
                  ? lang === "my"
                    ? "Credit Points ဖြင့် ချက်ချင်း အလှည့်နံပါတ် ယူမည်"
                    : "1-Click Pay with Credit Points"
                  : lang === "my"
                  ? "ပြေစာပို့ပြီး အလှည့်နံပါတ် ရယူမည်"
                  : "Submit Receipt & Get Queue Number"}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. AVAILABLE DOCTORS TODAY VIEW (DEFAULT LOGGED-IN VIEW)
  // ============================================================================
  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
      {patientIdCardModalElement}
      {/* Cancel / Refund Notification Banner */}
      {cancelNotice && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 text-emerald-950 shadow-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-700" />
            <p className="text-sm font-extrabold sm:text-base">{cancelNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setCancelNotice(null)}
            className="rounded-xl border border-emerald-700 px-3 py-1 text-xs font-black"
          >
            OK
          </button>
        </div>
      )}

      {/* Active Booking Return Banner if patient navigated to doctors list */}
      {activeBooking && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-emerald-700" />
            <span className="text-sm font-black text-emerald-950 sm:text-base">
              {lang === "my"
                ? `သင့်တွင် အလှည့်နံပါတ် (#${activeBooking.queue_number}) ရှိနေပါသည်`
                : `You have Queue Pass #${activeBooking.queue_number}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setView("tracker")}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white sm:text-sm"
          >
            {lang === "my"
              ? "တိုက်ရိုက် အလှည့်ကြည့်ရန် →"
              : "Open Live Tracker →"}
          </button>
        </div>
      )}

      {/* Welcome Gradient Banner */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-200">
                <UserCheck className="h-4 w-4 text-emerald-300" />
                <span className="truncate">
                  {lang === "my"
                    ? `မင်္ဂလာပါ • ${currentPatient.name}`
                    : `Welcome, ${currentPatient.name}`}
                </span>
              </div>
              <span className="rounded-full bg-amber-400 px-3 py-1 font-mono text-xs font-black text-slate-950 shadow-xs">
                ID: {currentPatient.patient_code}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-black sm:text-3xl">
              {lang === "my"
                ? "ယနေ့ ဆေးခန်းထိုင်မည့် အထူးကု ဆရာဝန်ကြီးများ"
                : "Doctors Available Today"}
            </h1>
            <p className="mt-1 text-sm font-medium text-blue-100 sm:text-base">
              {lang === "my"
                ? "ပြသလိုသော ဆရာဝန်ကြီးကို ရွေးချယ်ပြီး အလှည့်နံပါတ် ကြိုတင်ရယူပါ။"
                : "Tap on a specialist below to secure your live queue number."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPatientIdModal(true)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-white/40 bg-white/15 px-4 py-2.5 text-xs font-black text-white backdrop-blur-sm hover:bg-white/25 sm:text-sm"
            >
              <QrCode className="h-4 w-4 shrink-0 text-amber-300" />
              <span>
                {lang === "my"
                  ? "လူနာ ID / QR ကတ် (Screenshot ရိုက်ရန်)"
                  : "Patient ID & QR Card"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleEnablePushNotifications}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-xs font-black transition-all sm:text-sm ${
                notificationEnabled
                  ? "border-emerald-300 bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35"
                  : "border-amber-300 bg-amber-500 text-slate-950 shadow-md hover:bg-amber-400"
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span>
                {notificationEnabled
                  ? lang === "my"
                    ? "ဖုန်းသတိပေးချက် ဖွင့်ထားပြီး ('တီ' အသံစမ်းရန်)"
                    : "Push & Beep Active (Tap to Test)"
                  : lang === "my"
                  ? "ဖုန်းသတိပေးချက်နှင့် 'တီ' အသံဖွင့်ရန် (Screen Off ပါရသည်)"
                  : "Enable Push & 'Beep' Alerts"}
              </span>
            </button>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3.5 backdrop-blur-sm sm:p-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-sky-200">
                {lang === "my"
                  ? "သင့်လက်ကျန် Credit Points"
                  : "Your Credit Points"}
              </span>
              <span className="text-xl font-black text-emerald-300 sm:text-2xl">
                {formatCurrency(currentPatient.credit_points, lang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Clinic / Reception Announcements on Home Screen */}
      {messages.filter((m) => !m.patient_id || m.patient_id === currentPatient.id)
        .length > 0 && (
        <div className="mb-6 rounded-3xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="h-5 w-5 text-clinic-primary" />
              <h2 className="text-sm font-black text-slate-950 sm:text-base">
                {lang === "my"
                  ? "Reception မှ နောက်ဆုံးပေးပို့သော သတိပေးချက်များ"
                  : "Latest Announcements from Reception"}
              </h2>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-900">
              LIVE
            </span>
          </div>
          <div className="space-y-2">
            {messages
              .filter((m) => !m.patient_id || m.patient_id === currentPatient.id)
              .slice(0, 2)
              .map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-950 sm:text-sm">
                      {lang === "my" ? msg.title_my : msg.title_en}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-bold text-slate-700 sm:text-sm">
                    {lang === "my" ? msg.body_my : msg.body_en}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Doctors List */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {doctors
          .filter((d) => !d.is_archived && d.is_active)
          .map((doctor) => {
            const waitingCount = bookings.filter(
              (b) =>
                b.doctor_id === doctor.id &&
                (b.status === "waiting" || b.status === "in_progress")
            ).length;

            const isPostponed = doctor.status === "postponed";
            const isDelayed = doctor.status === "delayed";

            return (
              <div
                key={doctor.id}
                className={`flex flex-col justify-between gap-4 rounded-3xl border-2 bg-white p-5 shadow-md transition-all sm:flex-row sm:items-center sm:p-6 ${
                  isPostponed
                    ? "border-red-300 bg-red-50/30 opacity-90"
                    : "border-slate-200 hover:border-blue-600 hover:shadow-lg"
                }`}
              >
                <div className="min-w-0 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {doctor.doctor_code && (
                      <span className="rounded-xl bg-indigo-950 px-2.5 py-1 font-mono text-xs font-black text-amber-300">
                        {doctor.doctor_code}
                      </span>
                    )}
                    <span className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                      {lang === "my"
                        ? `အခန်း ${doctor.room_number}`
                        : `Room ${doctor.room_number}`}
                    </span>
                    {doctor.start_time && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-900">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {doctor.end_time
                          ? `${doctor.start_time} – ${doctor.end_time}`
                          : doctor.start_time}
                      </span>
                    )}

                    {/* Status Badge */}
                    {doctor.status === "available" && (
                      <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                        {lang === "my"
                          ? "● ဆေးခန်းထိုင်နေပါပြီ"
                          : "● Doctor Arrived"}
                      </span>
                    )}
                    {doctor.status === "not_arrived" && (
                      <span className="rounded-xl bg-sky-100 px-3 py-1 text-xs font-black text-sky-950">
                        {lang === "my"
                          ? "● မရောက်ရှိသေးပါ (ကြိုတင်ဘိုကင်ယူနိုင်သည်)"
                          : "● Not Arrived Yet (Pre-Booking Open)"}
                      </span>
                    )}
                    {isDelayed && (
                      <span className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-950">
                        {lang === "my"
                          ? `● ${doctor.delay_minutes} မိနစ် နောက်ကျမည်`
                          : `● Delayed ${doctor.delay_minutes}m`}
                      </span>
                    )}
                    {isPostponed && (
                      <span className="rounded-xl bg-red-100 px-3 py-1 text-xs font-black text-red-900">
                        {lang === "my"
                          ? `● ရက်ရွှေ့ဆိုင်းထားသည် (${
                              doctor.postponed_to || "TBA"
                            })`
                          : `● Postponed (${doctor.postponed_to || "TBA"})`}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
                      {lang === "my"
                        ? doctor.name_my || doctor.name
                        : doctor.name}
                    </h2>
                    <p className="text-sm font-bold text-clinic-primary sm:text-base">
                      {lang === "my"
                        ? doctor.specialty_my || doctor.specialty
                        : doctor.specialty}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {doctor.status === "not_arrived" ||
                    doctor.current_queue_number === 0 ? (
                      <div className="rounded-2xl border-2 border-sky-700 bg-sky-50 px-3.5 py-1.5 text-xs font-black text-sky-950 sm:text-sm">
                        {lang === "my"
                          ? "ဆရာဝန်ရောက်လျှင် #1 မှ စတင်ခေါ်ဆိုပါမည်"
                          : "Queue starts at #1 upon doctor arrival"}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-950 sm:text-sm">
                        {lang === "my"
                          ? `ယခုပြသနေသော နံပါတ် - #${doctor.current_queue_number}`
                          : `Now Serving: #${doctor.current_queue_number}`}
                      </div>
                    )}
                    <div className="rounded-2xl border-2 border-slate-200 bg-slate-100 px-3.5 py-1.5 text-xs font-extrabold text-slate-900 sm:text-sm">
                      {lang === "my"
                        ? `စောင့်ဆိုင်းနေသူ (${waitingCount}) ဦး`
                        : `${waitingCount} in Queue`}
                    </div>
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-black text-blue-950 sm:text-sm">
                      {lang === "my" ? "စမ်းသပ်ခ - " : "Fee: "}
                      {formatCurrency(doctor.consultation_fee, lang)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPostponed}
                  onClick={() => {
                    setSelectedDoctorId(doctor.id);
                    setView("checkout");
                  }}
                  className="flex min-h-[56px] shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-3.5 text-base font-black text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-400 sm:min-h-[60px] sm:text-lg"
                >
                  <span>
                    {isPostponed
                      ? lang === "my"
                        ? "ရက်ရွှေ့ဆိုင်းထားပါသည်"
                        : "Postponed"
                      : lang === "my"
                      ? "အလှည့်နံပါတ် ယူမည်"
                      : "Book Queue"}
                  </span>
                  {!isPostponed && <ArrowRight className="h-5 w-5" />}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
