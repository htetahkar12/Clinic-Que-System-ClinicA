"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  CLINIC_CONFIG,
  CLINIC_NAME,
  CLINIC_NAME_MY,
} from "@/clinic.config";
import { useClinic } from "@/lib/clinic-store";
import { Doctor, Booking } from "@/lib/types";
import { formatCurrency, formatPhoneDisplay } from "@/lib/utils";
import { enableNotifications } from "@/lib/firebase";
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
} from "lucide-react";

type OnboardingStep = "phone" | "otp";
type PortalView = "doctors" | "checkout" | "tracker";

export default function PatientPortalPage() {
  const {
    lang,
    patients,
    doctors,
    bookings,
    messages,
    currentPatient,
    loginWithPhoneOtp,
    createBooking,
    cancelBookingAndRefund,
    addDemoCreditPoints,
  } = useClinic();

  // Onboarding State
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("phone");
  const [phoneInput, setPhoneInput] = useState("095123456");
  const [nameInput, setNameInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Portal Navigation State
  const [view, setView] = useState<PortalView>("doctors");
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

  const t = useCallbackText(lang);

  // Active booking for logged-in patient
  const activeBooking: Booking | undefined = useMemo(() => {
    if (!currentPatient) return undefined;
    return bookings.find(
      (b) =>
        b.patient_id === currentPatient.id &&
        (b.status === "waiting" || b.status === "in_progress")
    );
  }, [bookings, currentPatient]);

  // Support direct booking URL `?doctor=<id>`
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get("doctor");
    if (docParam && doctors.some((d) => d.id === docParam)) {
      setSelectedDoctorId(docParam);
      if (currentPatient && !activeBooking) {
        setView("checkout");
      }
    }
  }, [doctors, currentPatient, activeBooking]);

  // Automatically switch to live tracker if patient has an active booking
  useEffect(() => {
    if (activeBooking) {
      setView("tracker");
    } else if (view === "tracker") {
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

  // Generate QR code on client if activeBooking doesn't have qr_image_url cached yet
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
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const ticketCode =
      activeBooking.ticket_code || `Q-${activeBooking.queue_number}`;
    const url = `${origin}/ticket/${activeBooking.id}?code=${ticketCode}`;
    QRCode.toDataURL(url, {
      width: 340,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setFallbackQrUrl)
      .catch(() => setFallbackQrUrl(null));
  }, [activeBooking]);

  const handlePhoneKeyPress = (digit: string) => {
    setAuthError("");
    if (onboardingStep === "phone") {
      if (phoneInput.length < 13) setPhoneInput((prev) => prev + digit);
    } else {
      if (otpInput.length < 6) setOtpInput((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setAuthError("");
    if (onboardingStep === "phone") {
      setPhoneInput((prev) => prev.slice(0, -1));
    } else {
      setOtpInput((prev) => prev.slice(0, -1));
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneInput.replace(/\D/g, "");
    if (cleaned.length < 7) {
      setAuthError(
        lang === "my"
          ? "ကျေးဇူးပြု၍ ဖုန်းနံပါတ် မှန်ကန်စွာ ရိုက်ထည့်ပါ (ဥပမာ 095123456)"
          : "Please enter a valid mobile number (e.g., 095123456)."
      );
      return;
    }
    setIsSendingOtp(true);
    setAuthError("");
    try {
      await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: cleaned }),
      }).catch(() => {});
      setOtpInput("1234"); // Pre-fill demo OTP for elderly usability
      setOnboardingStep("otp");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim().length < 4) {
      setAuthError(
        lang === "my"
          ? "ဂဏန်း ၄ လုံးပါ OTP ကုဒ်ကို ရိုက်ထည့်ပါ (စမ်းသပ်ရန် - 1234)"
          : "Please enter the 4-digit OTP code (use 1234 for demo)."
      );
      return;
    }
    await loginWithPhoneOtp(phoneInput, nameInput);
    setOnboardingStep("phone");
    setOtpInput("");
  };

  const handleEnablePushNotifications = async () => {
    const res = await enableNotifications();
    if (res.permission === "granted" || res.token) {
      setNotificationEnabled(true);
    }
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
    const res = await cancelBookingAndRefund(bookingId);
    if (res.refundedAmount > 0) {
      setCancelNotice(
        lang === "my"
          ? `သင့်ရက်ချိန်းကို ပယ်ဖျက်ပြီးပါပြီ။ စမ်းသပ်ခ ${formatCurrency(
              res.refundedAmount,
              "my"
            )} ကို နောက်တစ်ကြိမ် အသုံးပြုနိုင်ရန် Credit Points အဖြစ် သင့်အကောင့်ထဲသို့ အလိုအလျောက် ပြန်ထည့်ပေးထားပါသည်။`
          : `Your booking has been canceled. ${formatCurrency(
              res.refundedAmount,
              "en"
            )} has been automatically credited to your Credit Points balance.`
      );
    } else {
      setCancelNotice(
        lang === "my"
          ? "သင့်ရက်ချိန်းကို ပယ်ဖျက်ပြီးပါပြီ။"
          : "Your booking has been canceled."
      );
    }
  };

  // ============================================================================
  // 1. FRICTIONLESS SMS OTP ONBOARDING SCREEN
  // ============================================================================
  if (!currentPatient) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {/* Hero Welcome Banner with Royal Gradient */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>
              {lang === "my"
                ? "အက်ပ်ဒေါင်းရန်မလို • တိုက်ရိုက် အလှည့်ကြည့်စနစ်"
                : "No App Download • Instant Live Queue"}
            </span>
          </div>
          <h1 className="text-2xl font-black leading-snug sm:text-3xl">
            {lang === "my"
              ? `${CLINIC_NAME_MY} မှ ကြိုဆိုပါသည်`
              : `Welcome to ${CLINIC_NAME}`}
          </h1>
          <p className="mt-2 text-base font-medium leading-relaxed text-blue-100 sm:text-lg">
            {lang === "my"
              ? "ဆေးခန်းတွင် အကြာကြီး ထိုင်စောင့်ရန် မလိုဘဲ မိမိဖုန်းဖြင့် အလှည့်နံပါတ် ရယူပြီး အချိန်နှင့်တစ်ပြေးညီ စောင့်ကြည့်နိုင်ပါပြီ။"
              : "Book your doctor queue number from home and track your live turn directly on your phone."}
          </p>
        </div>

        <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
            {onboardingStep === "phone"
              ? lang === "my"
                ? "ဖုန်းနံပါတ်ဖြင့် ဝင်ရောက်ပါ"
                : "Enter Your Phone Number"
              : lang === "my"
              ? "SMS အတည်ပြုကုဒ် (OTP) ရိုက်ထည့်ပါ"
              : "Enter 4-Digit SMS Code"}
          </h2>
          <p className="mt-1.5 text-base font-medium text-slate-700">
            {onboardingStep === "phone"
              ? lang === "my"
                ? "သင့်ဖုန်းနံပါတ်ကို အောက်ပါ ခလုတ်ကြီးများဖြင့် အလွယ်တကူ နှိပ်ပါ။"
                : "Tap the large buttons below to enter your mobile number."
              : lang === "my"
              ? `${formatPhoneDisplay(phoneInput)} သို့ ပို့ထားသော ကုဒ်ကို ထည့်ပါ (စမ်းသပ်ရန် 1234)`
              : `Code sent to ${formatPhoneDisplay(phoneInput)} (Demo code: 1234)`}
          </p>

          {/* Quick Demo Patient Switcher for Testing */}
          {onboardingStep === "phone" && (
            <div className="mt-4 rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5">
              <span className="block text-xs font-extrabold uppercase tracking-wider text-blue-950">
                {lang === "my"
                  ? "စမ်းသပ်ရန် လူနာအကောင့်များ (တစ်ချက်နှိပ်ရုံဖြင့် ဝင်နိုင်သည်) -"
                  : "Quick Demo Patient Accounts (Tap to Fill):"}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {patients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPhoneInput(p.phone);
                      setNameInput(p.name);
                      setAuthError("");
                    }}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-xs font-extrabold transition-all ${
                      phoneInput === p.phone
                        ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                        : "border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <div>{p.name}</div>
                    <div className="opacity-85">
                      {p.phone} • {formatCurrency(p.credit_points, lang)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={
              onboardingStep === "phone" ? handleRequestOtp : handleVerifyOtp
            }
            className="mt-5 space-y-5"
          >
            {/* High-Contrast Display Screen */}
            <div>
              <label className="mb-2 block text-base font-extrabold text-slate-900">
                {onboardingStep === "phone"
                  ? lang === "my"
                    ? "မိုဘိုင်းဖုန်းနံပါတ်"
                    : "Mobile Number"
                  : lang === "my"
                  ? "ဂဏန်း ၄ လုံး OTP ကုဒ်"
                  : "4-Digit OTP Code"}
              </label>
              <div className="flex min-h-[68px] items-center justify-between rounded-2xl border-2 border-slate-900 bg-slate-50 px-5 py-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <Phone className="h-7 w-7 text-clinic-primary" />
                  <span className="text-2xl font-black tracking-wider text-slate-950 sm:text-3xl">
                    {onboardingStep === "phone"
                      ? phoneInput || "09..."
                      : otpInput || "••••"}
                  </span>
                </div>
                {onboardingStep === "otp" && (
                  <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                    Demo: 1234
                  </span>
                )}
              </div>
            </div>

            {/* Optional Patient Name Input for New Users */}
            {onboardingStep === "phone" && (
              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-slate-800">
                  {lang === "my"
                    ? "လူနာအမည် (အကောင့်အသစ်ဖြစ်ပါက ထည့်သွင်းနိုင်သည်)"
                    : "Patient Name (Optional for new patients)"}
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={
                    lang === "my"
                      ? "ဥပမာ - ဦးအောင်မင်း / ဒေါ်စုစု"
                      : "e.g., U Aung Min / Daw Su Su"
                  }
                  className="min-h-[52px] w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 focus:border-clinic-primary focus:outline-none"
                />
              </div>
            )}

            {/* Elderly-Friendly Tactile Dial Pad (60px height buttons) */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePhoneKeyPress(digit)}
                  className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 text-2xl font-black text-slate-950 shadow-sm active:scale-95 active:bg-slate-200"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (onboardingStep === "phone") setPhoneInput("");
                  else setOtpInput("");
                }}
                className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-100 text-sm font-extrabold text-slate-800 active:scale-95"
              >
                {lang === "my" ? "အကုန်ဖျက်" : "CLEAR"}
              </button>
              <button
                type="button"
                onClick={() => handlePhoneKeyPress("0")}
                className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-gradient-to-b from-white to-slate-100 text-2xl font-black text-slate-950 shadow-sm active:scale-95 active:bg-slate-200"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Delete last digit"
                className="flex min-h-[60px] items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-100 text-slate-900 active:scale-95"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>

            {authError && (
              <div className="rounded-2xl border-2 border-red-700 bg-red-50 p-4 text-base font-extrabold text-red-900">
                {authError}
              </div>
            )}

            {/* Single Primary CTA */}
            <button
              type="submit"
              disabled={isSendingOtp}
              className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-xl font-black text-white shadow-lg transition-all hover:opacity-95 active:scale-[0.99]"
            >
              <span>
                {onboardingStep === "phone"
                  ? lang === "my"
                    ? "OTP ကုဒ် ရယူမည်"
                    : "Send SMS OTP Code"
                  : lang === "my"
                  ? "အတည်ပြုပြီး ဆေးခန်းစနစ်သို့ ဝင်မည်"
                  : "Verify & Sign In Now"}
              </span>
              <ArrowRight className="h-6 w-6" />
            </button>

            {onboardingStep === "otp" && (
              <button
                type="button"
                onClick={() => setOnboardingStep("phone")}
                className="flex min-h-[50px] w-full items-center justify-center rounded-2xl border-2 border-slate-300 bg-white text-base font-extrabold text-slate-800 hover:bg-slate-100"
              >
                {lang === "my"
                  ? "← ဖုန်းနံပါတ် ပြန်ပြင်မည်"
                  : "← Change Phone Number"}
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. LIVE QUEUE TRACKER VIEW (WITH QR CODE, DOCTOR ALERTS & SMART ETA)
  // ============================================================================
  if (view === "tracker" && activeBooking) {
    const doctor = doctors.find((d) => d.id === activeBooking.doctor_id);
    const currentServing = doctor?.current_queue_number ?? 0;
    const myQueueNumber = activeBooking.queue_number;
    const patientsAhead = Math.max(0, myQueueNumber - currentServing);
    const isMyTurn = myQueueNumber === currentServing;
    const isApproaching = patientsAhead > 0 && patientsAhead <= 3;
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
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        {/* Top Patient Welcome & Status Pill */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
              {lang === "my" ? "လူနာအမည်" : "Patient"}
            </p>
            <h1 className="text-xl font-black text-slate-950">
              {currentPatient.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeBooking.is_priority && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-950">
                <Crown className="h-4 w-4 text-amber-600" />
                {lang === "my" ? "ဦးစားပေး (VIP)" : "Priority VIP"}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3.5 py-1.5 text-sm font-black ${
                activeBooking.payment_status === "paid"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                  : "border-amber-600 bg-amber-50 text-amber-950"
              }`}
            >
              {activeBooking.payment_status === "paid" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  {lang === "my" ? "ငွေပေးချေပြီး (အတည်ပြုပြီး)" : "Paid & Confirmed"}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-amber-700" />
                  {lang === "my"
                    ? "ငွေလွှဲပြေစာ စစ်ဆေးနေဆဲ"
                    : "Verifying Payment Receipt"}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Doctor Postponed / Delayed Warning Banner */}
        {doctor && doctor.status !== "available" && (
          <div
            className={`mb-5 rounded-3xl border-4 p-5 shadow-md ${
              doctor.status === "postponed"
                ? "border-red-700 bg-gradient-to-r from-red-50 to-rose-100 text-red-950"
                : "border-amber-600 bg-gradient-to-r from-amber-50 to-orange-100 text-amber-950"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="h-8 w-8 shrink-0" />
              <div>
                <h2 className="text-xl font-black">
                  {doctor.status === "postponed"
                    ? lang === "my"
                      ? "ဆရာဝန်ကြီး ယနေ့ ရက်ချိန်း ရွှေ့ဆိုင်းထားပါသည်"
                      : "Doctor Session Postponed"
                    : lang === "my"
                    ? `ဆရာဝန်ကြီး ${doctor.delay_minutes} မိနစ်ခန့် နောက်ကျမည်ဖြစ်ပါသည်`
                    : `Doctor Delayed by ${doctor.delay_minutes} Minutes`}
                </h2>
                <p className="mt-1 text-base font-bold">
                  {doctor.status === "postponed"
                    ? lang === "my"
                      ? `ပြန်လည်ချိန်းဆိုသည့်ရက် - ${
                          doctor.postponed_to || "ထပ်မံအကြောင်းကြားပါမည်"
                        }`
                      : `Rescheduled Date: ${doctor.postponed_to || "TBA"}`
                    : doctor.status_note ||
                      (lang === "my"
                        ? "အရေးပေါ်လူနာ ကြည့်ရှုနေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။"
                        : "Please wait comfortably; the queue will resume shortly.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Smart ETA Approaching / Turn Now Alert Banner */}
        {(isMyTurn || isApproaching) && (
          <div
            className={`mb-6 rounded-3xl border-4 p-5 text-white shadow-xl ${
              isMyTurn
                ? "border-emerald-300 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800"
                : "border-amber-300 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-800"
            }`}
          >
            <div className="flex items-start gap-4">
              <Bell className="h-9 w-9 shrink-0 animate-bounce" />
              <div>
                <h2 className="text-xl font-black sm:text-2xl">
                  {isMyTurn
                    ? lang === "my"
                      ? "သင့်အလှည့် ရောက်ပါပြီ! အခန်းထဲသို့ ဝင်ရောက်နိုင်ပါပြီ"
                      : "IT IS YOUR TURN NOW!"
                    : lang === "my"
                    ? `သင့်အလှည့် ရောက်ရန် လူနာ (${patientsAhead}) ဦးသာ လိုပါတော့သည်!`
                    : `YOUR TURN IS APPROACHING (${patientsAhead} Patients Away)`}
                </h2>
                <p className="mt-1 text-base font-bold text-white/95 sm:text-lg">
                  {isMyTurn
                    ? lang === "my"
                      ? `ကျေးဇူးပြု၍ အခန်းအမှတ် (${doctor?.room_number}) - ${doctor?.name_my} ထံသို့ ယခုပင် ဝင်ရောက်ပေးပါ။`
                      : `Please enter Room ${doctor?.room_number} (${doctor?.name}) immediately.`
                    : lang === "my"
                    ? `ဆေးခန်းသို့ ကြွရောက်ပေးပါရန်နှင့် အခန်း (${doctor?.room_number}) ရှေ့တွင် အသင့်စောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။`
                    : `Please proceed to the clinic and wait near Room ${doctor?.room_number}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Massive Color-Coded Live Queue Comparison Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Clinic's Current Queue Number */}
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-center text-white shadow-lg">
            <span className="text-sm font-extrabold uppercase tracking-wider text-sky-300">
              {lang === "my"
                ? "ယခု ပြသနေသော အလှည့်နံပါတ်"
                : "Now Serving in Clinic"}
            </span>
            <span className="my-2 text-7xl font-black tracking-tighter text-white sm:text-8xl">
              #{currentServing}
            </span>
            <span className="rounded-xl bg-white/15 px-3.5 py-1 text-sm font-bold text-slate-100">
              {lang === "my"
                ? `အခန်း (${doctor?.room_number}) • ${doctor?.name_my}`
                : `Room ${doctor?.room_number} • ${doctor?.name}`}
            </span>
          </div>

          {/* Patient's Assigned Queue Number */}
          <div
            className={`flex flex-col items-center justify-center rounded-3xl border-4 p-6 text-center text-white shadow-xl ${
              isMyTurn
                ? "border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-800"
                : isApproaching
                ? "border-amber-300 bg-gradient-to-br from-amber-500 to-orange-700"
                : "border-blue-400 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900"
            }`}
          >
            <span className="text-sm font-extrabold uppercase tracking-wider text-white/90">
              {lang === "my" ? "သင့်အလှည့် နံပါတ်" : "Your Queue Number"}
            </span>
            <span className="my-2 text-7xl font-black tracking-tighter sm:text-8xl">
              #{myQueueNumber}
            </span>
            <span className="rounded-xl bg-black/25 px-3.5 py-1 text-sm font-extrabold">
              {isMyTurn
                ? lang === "my"
                  ? "အခန်းအမှတ် " + doctor?.room_number + " သို့ ဝင်ပါ"
                  : `Enter Room ${doctor?.room_number} Now`
                : patientsAhead === 0
                ? lang === "my"
                  ? "သင့်အလှည့် ပြီးဆုံး/ကျော်သွားပါပြီ"
                  : "Queue Number Passed"
                : lang === "my"
                ? `သင့်ရှေ့တွင် လူနာ (${patientsAhead}) ဦး ကျန်ပါသည်`
                : `${patientsAhead} patient(s) ahead of you`}
            </span>
          </div>
        </div>

        {/* Doctor & Estimated Wait Card */}
        <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-md">
          <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-100 pb-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-clinic-primary">
                {lang === "my"
                  ? doctor?.specialty_my || doctor?.specialty
                  : doctor?.specialty}
              </span>
              <h3 className="text-2xl font-black text-slate-950">
                {lang === "my" ? doctor?.name_my || doctor?.name : doctor?.name}
              </h3>
              <p className="mt-0.5 text-sm font-bold text-slate-600">
                {lang === "my"
                  ? `ကြည့်ရှုချိန် - ${doctor?.start_time} မှ ${doctor?.end_time}`
                  : `Consultation Hours: ${doctor?.start_time} – ${doctor?.end_time}`}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-4 py-2.5 text-base font-black text-white shadow-sm">
              <Building2 className="h-5 w-5" />
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
                <p className="text-xl font-black text-slate-950">
                  {isMyTurn
                    ? lang === "my"
                      ? "၀ မိနစ် (ယခုဝင်ပါ)"
                      : "0 mins (Now Serving)"
                    : lang === "my"
                    ? `~ ${estimatedWaitMinutes} မိနစ်ခန့်`
                    : `~ ${estimatedWaitMinutes} Minutes`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnablePushNotifications}
              className={`flex min-h-[60px] items-center justify-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-base font-extrabold transition-all ${
                notificationEnabled
                  ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                  : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Bell className="h-5 w-5" />
              <span>
                {notificationEnabled
                  ? lang === "my"
                    ? "အသိပေးချက် ဖွင့်ထားပြီး"
                    : "Push Alerts Active"
                  : lang === "my"
                  ? "အလှည့်နီးလျှင် ဖုန်းသတိပေးချက် ဖွင့်မည်"
                  : "Enable Turn Alerts (FCM)"}
              </span>
            </button>
          </div>
        </div>

        {/* Live Doctor Broadcast & Automated Messages Feed */}
        <div className="mt-5 rounded-3xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MessageSquareHeart className="h-6 w-6 text-clinic-primary" />
              <h3 className="text-lg font-black text-slate-950 sm:text-xl">
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
            <p className="text-base font-bold text-slate-600">
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-slate-950">
                      {lang === "my" ? msg.title_my : msg.title_en}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-base font-medium leading-relaxed text-slate-800">
                    {lang === "my" ? msg.body_my : msg.body_en}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digital QR Code Queue Ticket Card */}
        <div className="mt-5 rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-md">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
              {fallbackQrUrl ? (
                <img
                  src={fallbackQrUrl}
                  alt={`QR Ticket ${ticketCode}`}
                  className="h-44 w-44 rounded-xl object-contain"
                />
              ) : (
                <div className="flex h-44 w-44 items-center justify-center">
                  <QrCode className="h-16 w-16 text-slate-400" />
                </div>
              )}
              <span className="mt-1.5 font-mono text-sm font-black text-slate-900">
                {ticketCode}
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
              <h3 className="mt-2 text-xl font-black text-slate-950">
                {lang === "my"
                  ? "ဆေးခန်းရောက်လျှင် ဤ QR ကုဒ်ကို ပြသပါ"
                  : "Show This QR Ticket at Reception"}
              </h3>
              <p className="mt-1 text-base font-medium text-slate-700">
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

        {/* Smart Credit Cancellation Option (No-Refund Policy -> Credit Points) */}
        <div className="mt-5 rounded-3xl border-2 border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-base font-black text-slate-900">
                {lang === "my"
                  ? "ယနေ့ မလာရောက်နိုင်တော့ပါက ရက်ချိန်းပယ်ဖျက်နိုင်ပါသည်"
                  : "Need to Cancel Today's Visit?"}
              </h4>
              <p className="mt-0.5 text-sm font-bold text-slate-600">
                {lang === "my"
                  ? "ပေးသွင်းထားသော စမ်းသပ်ခကို နောက်တစ်ကြိမ် ချက်ချင်းပြန်သုံးနိုင်ရန် Credit Points အဖြစ် အပြည့်အဝ ပြောင်းလဲပေးပါမည်။"
                  : "100% of your paid fee is converted into Credit Points for your next visit."}
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
                  ? "ရက်ချိန်းပယ်ဖျက်ပြီး ပွိုင့်ပြန်ယူမည်"
                  : "Cancel & Convert to Credit"}
              </span>
            </button>
          </div>
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
        ? CLINIC_CONFIG.paymentAccounts.kpay
        : paymentMethod === "wavepay"
        ? CLINIC_CONFIG.paymentAccounts.wavepay
        : CLINIC_CONFIG.paymentAccounts.ayapay;

    return (
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => setView("doctors")}
          className="mb-5 inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-base font-extrabold text-slate-900 shadow-sm hover:bg-slate-100"
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
          <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-6 text-white">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
              {lang === "my"
                ? "အဆင့် (၂) • အလှည့်နံပါတ် အတည်ပြုရယူရန်"
                : "Step 2 • Secure Your Queue Number"}
            </span>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              {lang === "my"
                ? selectedDoctor.name_my || selectedDoctor.name
                : selectedDoctor.name}
            </h1>
            <p className="mt-1 text-base font-bold text-blue-100">
              {lang === "my"
                ? `${selectedDoctor.specialty_my} • အခန်း (${selectedDoctor.room_number})`
                : `${selectedDoctor.specialty} • Room ${selectedDoctor.room_number}`}
            </p>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <span className="text-base font-extrabold">
                {lang === "my" ? "ကြိုတင်စမ်းသပ်ခ" : "Consultation Fee"}
              </span>
              <span className="text-2xl font-black text-emerald-300">
                {formatCurrency(selectedDoctor.consultation_fee, lang)}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <h2 className="mb-3 text-lg font-black text-slate-950">
              {lang === "my"
                ? "ငွေပေးချေမည့် နည်းလမ်းကို ရွေးချယ်ပါ"
                : "Select Payment Method"}
            </h2>

            <div className="space-y-3">
              {/* OPTION A: 1-Click Credit Points */}
              <button
                type="button"
                onClick={() => setPaymentMethod("credit_points")}
                className={`flex min-h-[76px] w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                  paymentMethod === "credit_points"
                    ? "border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 ring-4 ring-emerald-600/20"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-950">
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
                    <p className="text-sm font-bold text-slate-700">
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
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {(["kpay", "wavepay", "ayapay"] as const).map((method) => {
                  const labels = {
                    kpay: {
                      title: "KBZPay (KPay)",
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
                      className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all ${
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
                      <span className="mt-1 text-xs font-bold text-slate-700">
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
                  <p className="text-base font-bold text-emerald-950">
                    {lang === "my"
                      ? `ပြေစာပုံ တင်ရန်မလိုပါ။ သင့် Credit Points မှ ${formatCurrency(
                          selectedDoctor.consultation_fee,
                          "my"
                        )} နှုတ်ယူပြီး ချက်ချင်း အလှည့်နံပါတ် ရရှိပါမည်။`
                      : `No screenshot needed! ${formatCurrency(
                          selectedDoctor.consultation_fee,
                          "en"
                        )} will be deducted from your Credit Points immediately.`}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-base font-bold text-amber-950">
                      {lang === "my"
                        ? "သင့်တွင် Credit Points မလုံလောက်သေးပါ။ KPay / WavePay / AYA Pay ရွေးချယ်ပါ (သို့မဟုတ် စမ်းသပ်ရန် အောက်ပါခလုတ်ဖြင့် ပွိုင့်ဖြည့်ပါ)။"
                        : "Not enough Credit Points. Choose KPay/WavePay/AYA Pay above, or top up demo points below to test 1-click checkout:"}
                    </p>
                    <button
                      type="button"
                      onClick={() => addDemoCreditPoints(15000)}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
                    >
                      <Wallet className="h-4 w-4" />
                      <span>
                        {lang === "my"
                          ? "+ ၁၅,၀၀၀ ကျပ် စမ်းသပ်ပွိုင့် ဖြည့်မည်"
                          : "+ Add 15,000 MMK Demo Credit Points"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
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
                      className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border-2 border-blue-700 bg-blue-50 px-3.5 py-2 text-sm font-black text-blue-900 hover:bg-blue-100"
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
                            {lang === "my" ? "ဖုန်းနံပါတ် ကူးမည်" : "Copy Number"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-base font-extrabold text-slate-900">
                    {lang === "my"
                      ? "ငွေလွှဲပြေစာ (Screenshot) ပုံ တင်ပေးပါ"
                      : "Upload Transfer Screenshot"}
                  </label>
                  <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-600 bg-white p-4 text-center hover:bg-blue-50/40">
                    <Upload className="mb-2 h-8 w-8 text-clinic-primary" />
                    <span className="text-base font-black text-slate-950">
                      {receiptFile
                        ? receiptFile.name
                        : lang === "my"
                        ? "ပြေစာပုံ ရွေးချယ်ရန် ဤနေရာကို နှိပ်ပါ"
                        : "Tap Here to Choose Screenshot"}
                    </span>
                    <span className="mt-1 text-xs font-bold text-slate-600">
                      {lang === "my"
                        ? "(စမ်းသပ်နေစဉ် ပုံမရွေးဘဲ တိုက်ရိုက် အတည်ပြုနိုင်ပါသည် - နမူနာပြေစာ အလိုအလျောက် တွဲပေးပါမည်)"
                        : "(In demo mode, a sample receipt is attached automatically if left blank)"}
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
              <div className="mt-4 rounded-2xl border-2 border-red-700 bg-red-50 p-4 text-base font-extrabold text-red-900">
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
              className="mt-6 flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-xl font-black text-white shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-6 w-6" />
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* Cancel / Refund Notification Banner */}
      {cancelNotice && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 text-emerald-950 shadow-md">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-700" />
            <p className="text-base font-extrabold">{cancelNotice}</p>
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

      {/* Welcome Gradient Banner */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-200">
              <UserCheck className="h-4 w-4 text-emerald-300" />
              <span>
                {lang === "my"
                  ? `မင်္ဂလာပါ • ${currentPatient.name}`
                  : `Welcome, ${currentPatient.name}`}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {lang === "my"
                ? "ယနေ့ ဆေးခန်းထိုင်မည့် အထူးကု ဆရာဝန်ကြီးများ"
                : "Doctors Available Today"}
            </h1>
            <p className="mt-1 text-base font-medium text-blue-100">
              {lang === "my"
                ? "ပြသလိုသော ဆရာဝန်ကြီးကို ရွေးချယ်ပြီး အလှည့်နံပါတ် ကြိုတင်ရယူပါ။"
                : "Tap on a specialist below to secure your live queue number."}
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <span className="block text-xs font-bold uppercase tracking-wider text-sky-200">
              {lang === "my"
                ? "သင့်လက်ကျန် Credit Points"
                : "Your Credit Points"}
            </span>
            <span className="text-2xl font-black text-emerald-300">
              {formatCurrency(currentPatient.credit_points, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Doctors List */}
      <div className="grid grid-cols-1 gap-5">
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
                className={`flex flex-col justify-between gap-5 rounded-3xl border-2 bg-white p-6 shadow-md transition-all sm:flex-row sm:items-center ${
                  isPostponed
                    ? "border-red-300 bg-red-50/30 opacity-90"
                    : "border-slate-200 hover:border-blue-600 hover:shadow-lg"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                      {lang === "my"
                        ? `အခန်း ${doctor.room_number}`
                        : `Room ${doctor.room_number}`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-900">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {doctor.start_time} – {doctor.end_time}
                    </span>

                    {/* Status Badge */}
                    {doctor.status === "available" && (
                      <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
                        {lang === "my"
                          ? "● ဆေးခန်းထိုင်နေပါသည်"
                          : "● Available Today"}
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
                    <h2 className="text-2xl font-black text-slate-950">
                      {lang === "my"
                        ? doctor.name_my || doctor.name
                        : doctor.name}
                    </h2>
                    <p className="text-base font-bold text-clinic-primary">
                      {lang === "my"
                        ? doctor.specialty_my || doctor.specialty
                        : doctor.specialty}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-3.5 py-1.5 text-sm font-black text-emerald-950">
                      {lang === "my"
                        ? `ယခုပြသနေသော နံပါတ် - #${doctor.current_queue_number}`
                        : `Now Serving: #${doctor.current_queue_number}`}
                    </div>
                    <div className="rounded-2xl border-2 border-slate-200 bg-slate-100 px-3.5 py-1.5 text-sm font-extrabold text-slate-900">
                      {lang === "my"
                        ? `စောင့်ဆိုင်းနေသူ (${waitingCount}) ဦး`
                        : `${waitingCount} in Queue`}
                    </div>
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-3.5 py-1.5 text-sm font-black text-blue-950">
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
                  className="flex min-h-[60px] shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-lg font-black text-white shadow-md transition-all hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-400"
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

function useCallbackText(lang: "my" | "en") {
  return lang;
}
