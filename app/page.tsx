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
  Search,
  SlidersHorizontal,
  Star,
  Home,
  Ticket,
  Keyboard,
  Stethoscope,
} from "lucide-react";

type LoginTabMode = "register_or_phone" | "returning_id";
type PortalView = "doctors" | "checkout" | "tracker";

// Helper to render custom medical specialty SVG illustrations matching Screenshot 5's Royal Blue Service Cards
function ServiceCategoryIcon({ type }: { type: string }) {
  switch (type) {
    case "dental":
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <path
            d="M20 14C13.5 14 10 19.5 10 26.5C10 34.5 14 40.5 16.5 48.5C18 53 20.5 55 23 55C25.5 55 27 49 28.5 43.5C29.5 40 30.5 39 32 39C33.5 39 34.5 40 35.5 43.5C37 49 38.5 55 41 55C43.5 55 46 53 47.5 48.5C50 40.5 54 34.5 54 26.5C54 19.5 50.5 14 44 14C39 14 35.5 16.5 32 16.5C28.5 16.5 25 14 20 14Z"
            fill="#F8FAFC"
            stroke="#93C5FD"
            strokeWidth="2.5"
          />
          <path
            d="M22 22C24.5 24.5 28 25.5 32 25.5C36 25.5 39.5 24.5 42 22"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "obgyn":
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <path
            d="M32 48C26 48 22 39 22 28C22 21 26.5 17 32 17C37.5 17 42 21 42 28C42 39 38 48 32 48Z"
            fill="#FDA4AF"
            stroke="#FFE4E6"
            strokeWidth="2.2"
          />
          <path
            d="M22 25C15 22 10 25 10 31C10 35 14 37 17 34M42 25C49 22 54 25 54 31C54 35 50 37 47 34"
            stroke="#FDA4AF"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="11" cy="33" r="4" fill="#FECDD3" />
          <circle cx="53" cy="33" r="4" fill="#FECDD3" />
          <path d="M29 48V55H35V48" fill="#FB7185" />
        </svg>
      );
    case "cardio":
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <path
            d="M32 53C32 53 12 40 12 24.5C12 17.5 17.5 12 24 12C28 12 30.5 14 32 16.5C33.5 14 36 12 40 12C46.5 12 52 17.5 52 24.5C52 40 32 53 32 53Z"
            fill="#FB7185"
            stroke="#FFE4E6"
            strokeWidth="2"
          />
          <path
            d="M17 30H25L28.5 22L34 38L38 28H47"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "peds":
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <circle cx="32" cy="34" r="18" fill="#FDE68A" stroke="#FEF3C7" strokeWidth="2.5" />
          <path
            d="M28 16C28 12 32 10 35 13C37 15 34 18 31 18"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="25" cy="32" r="2.5" fill="#1E293B" />
          <circle cx="39" cy="32" r="2.5" fill="#1E293B" />
          <path
            d="M26 40C28 43 36 43 38 40"
            stroke="#1E293B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "ortho":
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <path
            d="M21 15C17.5 15 15 17.5 15 21C15 23.5 16.5 25.5 19 26.5L37.5 45C38.5 47.5 40.5 49 43 49C46.5 49 49 46.5 49 43C49 40.5 47.5 38.5 45 37.5L26.5 19C25.5 16.5 23.5 15 21 15Z"
            fill="#F8FAFC"
            stroke="#BAE6FD"
            strokeWidth="2.5"
          />
          <circle cx="24" cy="17" r="4.5" fill="#F8FAFC" />
          <circle cx="17" cy="24" r="4.5" fill="#F8FAFC" />
          <circle cx="47" cy="40" r="4.5" fill="#F8FAFC" />
          <circle cx="40" cy="47" r="4.5" fill="#F8FAFC" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 64 64" className="h-9 w-9 sm:h-10 sm:w-10" fill="none">
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#EFF6FF" />
          <path
            d="M32 22V42M22 32H42"
            stroke="#1D4ED8"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

// Helper to render friendly vector Doctor Avatar illustrations matching Screenshot 5
function DoctorVectorAvatar({ index, isAvailable }: { index: number; isAvailable: boolean }) {
  const bgColors = [
    "from-amber-200 to-orange-200",
    "from-sky-200 to-blue-200",
    "from-emerald-200 to-teal-200",
    "from-purple-200 to-indigo-200",
  ];
  const hairColors = ["#7C2D12", "#1E293B", "#3F3F46", "#451A03"];
  const bg = bgColors[index % bgColors.length];
  const hair = hairColors[index % hairColors.length];

  return (
    <div className="relative shrink-0">
      <div
        className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br ${bg} shadow-md sm:h-20 sm:w-20`}
      >
        <svg viewBox="0 0 80 80" className="h-full w-full" fill="none">
          {/* Doctor White Coat & Shirt */}
          <path d="M14 78C14 60 25 52 40 52C55 52 66 60 66 78H14Z" fill="#FFFFFF" />
          <path d="M33 52L40 68L47 52H33Z" fill="#2563EB" />
          {/* Stethoscope around neck */}
          <path
            d="M27 54C27 63 32 67 40 67C48 67 53 63 53 54"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="48" cy="66" r="3.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="1.5" />
          {/* Neck & Head */}
          <rect x="35" y="42" width="10" height="12" rx="4" fill="#FDBA74" />
          <circle cx="40" cy="31" r="14" fill="#FED7AA" />
          {/* Hair */}
          <path
            d="M26 30C26 19 32 14 40 14C48 14 54 19 54 30C51 24 46 21 40 21C34 21 29 24 26 30Z"
            fill={hair}
          />
          {/* Friendly Eyes & Smile */}
          <circle cx="35" cy="31" r="1.8" fill="#0F172A" />
          <circle cx="45" cy="31" r="1.8" fill="#0F172A" />
          <path
            d="M36 37C37.5 39 42.5 39 44 37"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {/* Live Status Indicator Dot */}
      <span
        className={`absolute right-0.5 bottom-0.5 h-4 w-4 rounded-full border-2 border-white shadow-xs ${
          isAvailable ? "bg-emerald-500" : "bg-sky-500"
        }`}
      />
    </div>
  );
}

// Helper to render the Figma Hero Medical Illustration (Screenshots 1–4)
function FigmaMedicalHeroIllustration() {
  return (
    <div className="relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[26px] bg-white px-4 py-5 shadow-md sm:py-6">
      {/* Doctor & Patient Vector Scene */}
      <svg
        viewBox="0 0 280 185"
        className="h-40 w-full max-w-[260px] sm:h-44"
        fill="none"
      >
        {/* Soft Background Medical Blob */}
        <ellipse cx="135" cy="98" rx="98" ry="70" fill="#EFF6FF" />
        {/* Floating Medical Cross Shield */}
        <circle cx="138" cy="40" r="16" fill="#DBEAFE" />
        <path
          d="M138 32V48M130 40H146"
          stroke="#1828F5"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Left Character: Doctor in White Lab Coat with Clipboard */}
        <g>
          {/* Coat Body */}
          <path
            d="M52 172C52 136 68 120 92 120C116 120 132 136 132 172H52Z"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
          {/* Inner Blue Scrubs */}
          <path d="M82 120L92 148L102 120H82Z" fill="#1828F5" />
          {/* Stethoscope */}
          <path
            d="M74 122C74 136 82 142 92 142C102 142 110 136 110 122"
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="104" cy="142" r="4" fill="#38BDF8" stroke="#334155" strokeWidth="1.5" />
          {/* Head */}
          <circle cx="92" cy="90" r="20" fill="#FDBA74" />
          <path
            d="M72 88C72 72 80 65 92 65C104 65 112 72 112 88C107 79 100 76 92 76C84 76 77 79 72 88Z"
            fill="#1E293B"
          />
          <circle cx="85" cy="90" r="2" fill="#0F172A" />
          <circle cx="99" cy="90" r="2" fill="#0F172A" />
          <path d="M87 98C89 100.5 95 100.5 97 98" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          {/* Medical Clipboard in hand */}
          <rect x="108" y="126" width="26" height="34" rx="5" fill="#1828F5" />
          <rect x="113" y="132" width="16" height="22" rx="2" fill="#FFFFFF" />
          <path d="M116 139H126M116 145H124" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Right Character: Patient with Heart & Mobile Queue Pass */}
        <g>
          <path
            d="M150 172C150 138 165 124 188 124C211 124 226 138 226 172H150Z"
            fill="#4CAF50"
          />
          <circle cx="188" cy="94" r="19" fill="#FED7AA" />
          <path
            d="M169 92C169 76 177 69 188 69C199 69 207 76 207 92C202 84 195 81 188 81C181 81 174 84 169 92Z"
            fill="#451A03"
          />
          <circle cx="182" cy="94" r="2" fill="#0F172A" />
          <circle cx="194" cy="94" r="2" fill="#0F172A" />
          <path d="M183 101C185 103.5 191 103.5 193 101" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
          {/* Floating Heart Pill */}
          <circle cx="154" cy="68" r="12" fill="#FFE4E6" />
          <path
            d="M154 74C154 74 146 69 146 64C146 61.5 148 60 150 60C151.8 60 153 61 154 62.5C155 61 156.2 60 158 60C160 60 162 61.5 162 64C162 69 154 74 154 74Z"
            fill="#F43F5E"
          />
        </g>
      </svg>

      {/* Decorative Royal Blue 5-Point Stars on Right Edge (Exact Match to Screenshots 1–4) */}
      <div className="pointer-events-none absolute top-4 right-3 flex flex-col items-end gap-1.5">
        <svg viewBox="0 0 32 32" className="h-6 w-6 text-[#1828F5] drop-shadow-xs" fill="currentColor">
          <path d="M16 2L19.8 11.2L29.6 12L22.1 18.4L24.4 28L16 22.8L7.6 28L9.9 18.4L2.4 12L12.2 11.2L16 2Z" />
        </svg>
        <svg viewBox="0 0 32 32" className="mr-3 h-8 w-8 rotate-12 text-[#1828F5] drop-shadow-xs" fill="currentColor">
          <path d="M16 2L19.8 11.2L29.6 12L22.1 18.4L24.4 28L16 22.8L7.6 28L9.9 18.4L2.4 12L12.2 11.2L16 2Z" />
        </svg>
        <svg viewBox="0 0 32 32" className="h-5 w-5 -rotate-12 text-[#3B82F6] drop-shadow-xs" fill="currentColor">
          <path d="M16 2L19.8 11.2L29.6 12L22.1 18.4L24.4 28L16 22.8L7.6 28L9.9 18.4L2.4 12L12.2 11.2L16 2Z" />
        </svg>
      </div>
    </div>
  );
}

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
  const [showDialPad, setShowDialPad] = useState(false);

  // Patient ID & QR Card Modal State
  const [showPatientIdModal, setShowPatientIdModal] = useState(false);
  const [isNewAccountCreated, setIsNewAccountCreated] = useState(false);
  const [patientIdQrUrl, setPatientIdQrUrl] = useState<string | null>(null);
  const [copiedPatientCode, setCopiedPatientCode] = useState(false);

  // Portal Navigation & Search/Filter State (Screenshot 5 Dashboard)
  const [view, setView] = useState<PortalView>("doctors");
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all");
  const [showAllServices, setShowAllServices] = useState(false);

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

  // Service Categories for Screenshot 5's `SERVICES` Horizontal Grid
  const serviceCategories = useMemo(
    () => [
      {
        id: "all",
        icon: "general",
        labelMy: "အားလုံး",
        labelEn: "All",
        keywords: [],
      },
      {
        id: "dental",
        icon: "dental",
        labelMy: "သွားနှင့်ခံတွင်း",
        labelEn: "Dental",
        keywords: ["သွား", "dental", "dentist", "tooth", "oral"],
      },
      {
        id: "obgyn",
        icon: "obgyn",
        labelMy: "သားဖွားမီးယပ်",
        labelEn: "OB-Gyne",
        keywords: ["သားဖွား", "မီးယပ်", "ob", "gyn", "maternity"],
      },
      {
        id: "cardio",
        icon: "cardio",
        labelMy: "နှလုံးအထူးကု",
        labelEn: "Cardiology",
        keywords: ["နှလုံး", "cardio", "heart"],
      },
      {
        id: "general",
        icon: "general",
        labelMy: "အထွေထွေနှင့် သမားတော်",
        labelEn: "Physician",
        keywords: ["အထွေထွေ", "သမားတော်", "general", "physician", "internal"],
      },
      {
        id: "peds",
        icon: "peds",
        labelMy: "ကလေးအထူးကု",
        labelEn: "Pediatrics",
        keywords: ["ကလေး", "pediatric", "child"],
      },
      {
        id: "ortho",
        icon: "ortho",
        labelMy: "အရိုးနှင့် အကြော",
        labelEn: "Orthopedics",
        keywords: ["အရိုး", "အကြော", "ortho", "bone", "spine"],
      },
    ],
    []
  );

  // Filtered Doctors based on Search Bar & Selected Service Category
  const activeDoctorsList = useMemo(() => {
    const base = doctors.filter((d) => !d.is_archived && d.is_active);
    return base.filter((doc) => {
      const haystack = `${doc.name} ${doc.name_my} ${doc.specialty} ${doc.specialty_my} ${doc.doctor_code || ""} ${doc.room_number}`.toLowerCase();
      if (doctorSearchQuery.trim()) {
        const q = doctorSearchQuery.trim().toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (selectedServiceCategory !== "all") {
        const cat = serviceCategories.find((c) => c.id === selectedServiceCategory);
        if (cat && cat.keywords.length > 0) {
          const matchesCat = cat.keywords.some((kw) =>
            haystack.includes(kw.toLowerCase())
          );
          if (!matchesCat) return false;
        }
      }
      return true;
    });
  }, [doctors, doctorSearchQuery, selectedServiceCategory, serviceCategories]);

  // ============================================================================
  // 1. FIGMA-STYLE LOGIN / CREATE ACCOUNT / RETURNING ID SCREEN (Screenshots 1–4)
  // ============================================================================
  if (!currentPatient) {
    // Visual 4-slot code preview for Returning Patient ID mode (echoing Screenshot 2's 4-box verification card)
    const idPreviewChars = (patientCodeInput || "ID26").slice(-4).padEnd(4, "•").split("");

    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <div
          className={`mx-auto overflow-hidden rounded-[34px] shadow-2xl transition-all ${
            viewport.orientation === "landscape" && viewport.width >= 760
              ? "grid max-w-4xl grid-cols-12 items-center gap-6 p-6 sm:p-8"
              : "max-w-md p-5 sm:p-7"
          }`}
          style={{
            // Exact Diagonal Two-Tone Medical Green Split from Screenshots 1–4
            background:
              "linear-gradient(156deg, #4CAF50 0%, #4CAF50 53%, #7EC882 53.2%, #7EC882 100%)",
          }}
        >
          {/* Left / Top Column: Rounded White Medical Illustration Card with Blue Stars */}
          <div
            className={
              viewport.orientation === "landscape" && viewport.width >= 760
                ? "col-span-5 space-y-4"
                : "mb-5 space-y-3"
            }
          >
            <FigmaMedicalHeroIllustration />

            {/* Clinic Welcome Title & Zero-SMS Badge */}
            <div className="rounded-2xl bg-black/15 px-4 py-3 text-white backdrop-blur-xs">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-200" />
                <span>
                  {lang === "my"
                    ? "SMS မလိုသော လူနာ ID စနစ်"
                    : "Zero-SMS Patient ID"}
                </span>
              </div>
              <h1 className="mt-1 text-lg font-black leading-snug sm:text-xl">
                {lang === "my" ? settings.clinicNameMy : settings.clinicName}
              </h1>
              <p className="mt-0.5 text-xs font-bold leading-relaxed text-white/95">
                {lang === "my"
                  ? "အမည်နှင့် ဖုန်းနံပါတ် ရိုက်ထည့်ရုံဖြင့် သင့်ကိုယ်ပိုင် လူနာ ID နှင့် QR ကတ်ကို အလိုအလျောက် ထုတ်ပေးပါသည်။"
                  : "Enter your Name & Phone to get your automatic Patient ID & QR Card."}
              </p>
            </div>
          </div>

          {/* Right / Bottom Column: Clean Pill-Shaped Figma Inputs & Royal Blue CTA */}
          <div
            className={
              viewport.orientation === "landscape" && viewport.width >= 760
                ? "col-span-7"
                : ""
            }
          >
            {/* Mode Switcher Tabs (New/Phone vs Returning Patient ID) */}
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-1.5 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => {
                  setLoginMode("register_or_phone");
                  setAuthError("");
                }}
                className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-black transition-all sm:text-sm ${
                  loginMode === "register_or_phone"
                    ? "bg-[#1828F5] text-white shadow-md"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {lang === "my"
                  ? "၁။ အမည် + ဖုန်းဖြင့် ဝင်မည်"
                  : "1. Name + Phone"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode("returning_id");
                  setAuthError("");
                }}
                className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-black transition-all sm:text-sm ${
                  loginMode === "returning_id"
                    ? "bg-[#1828F5] text-white shadow-md"
                    : "text-white hover:bg-white/15"
                }`}
              >
                {lang === "my"
                  ? "၂။ လူနာ ID ဖြင့် ဝင်မည်"
                  : "2. Patient ID Login"}
              </button>
            </div>

            <form onSubmit={handlePatientLoginSubmit} className="space-y-3.5">
              {loginMode === "returning_id" && (
                <div className="space-y-2.5">
                  {/* 4-Box Verification Style Visual Badge (Matching Screenshot 2) */}
                  <div className="rounded-2xl bg-white/90 p-3 text-center shadow-sm">
                    <p className="text-xs font-extrabold text-slate-700">
                      {lang === "my"
                        ? "သင်သိမ်းဆည်းထားသော လူနာ ID နံပါတ်ကို ရိုက်ထည့်ပါ"
                        : "Enter your saved Patient ID Code"}
                    </p>
                    <div className="mt-2 flex justify-center gap-2.5">
                      {idPreviewChars.map((ch, idx) => (
                        <div
                          key={idx}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-indigo-200 bg-slate-100 font-mono text-lg font-black text-[#1828F5] shadow-inner"
                        >
                          {ch}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pill Input for Patient ID */}
                  <div className="flex min-h-[54px] items-center gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-md">
                    <QrCode className="h-5 w-5 shrink-0 text-[#1828F5]" />
                    <input
                      type="text"
                      value={patientCodeInput}
                      onChange={(e) => {
                        setAuthError("");
                        setPatientCodeInput(e.target.value.toUpperCase());
                      }}
                      placeholder={
                        lang === "my"
                          ? "လူနာ ID (ဥပမာ - ASC2610250001)"
                          : "Patient ID (e.g. ASC2610250001)"
                      }
                      className="w-full bg-transparent font-mono text-base font-black uppercase tracking-wider text-slate-950 placeholder:font-sans placeholder:text-slate-400 focus:outline-none sm:text-lg"
                    />
                  </div>
                </div>
              )}

              {/* Pill Input: Patient Full Name */}
              <div className="flex min-h-[54px] items-center gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-md">
                <UserCheck className="h-5 w-5 shrink-0 text-[#1828F5]" />
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setAuthError("");
                    setNameInput(e.target.value);
                  }}
                  placeholder={
                    loginMode === "register_or_phone"
                      ? lang === "my"
                        ? "လူနာအမည် အပြည့်အစုံ (ဥပမာ - ဦးဘလှိုင်)"
                        : "Name (e.g., U Ba Hlaing)"
                      : lang === "my"
                      ? "လူနာအမည် (အတည်ပြုရန်)"
                      : "Patient Name (For Verification)"
                  }
                  className="w-full bg-transparent text-base font-black text-slate-950 placeholder:text-slate-400 focus:outline-none sm:text-lg"
                />
              </div>

              {/* Pill Input: Mobile Phone Number + Quick Dialpad Toggle */}
              <div className="flex min-h-[54px] items-center gap-2 rounded-2xl bg-white/95 px-4 py-2.5 shadow-md">
                <Phone className="h-5 w-5 shrink-0 text-[#1828F5]" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setAuthError("");
                    setPhoneInput(e.target.value.replace(/[^0-9+]/g, ""));
                  }}
                  placeholder={
                    loginMode === "register_or_phone"
                      ? lang === "my"
                        ? "ဖုန်းနံပါတ် (09...)"
                        : "Phone number (09...)"
                      : lang === "my"
                      ? "ဖုန်းနံပါတ် (မှတ်မိပါက ထည့်ရန်)"
                      : "Phone number (Optional)"
                  }
                  className="w-full bg-transparent text-lg font-black tracking-wider text-slate-950 placeholder:text-slate-400 focus:outline-none sm:text-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowDialPad((prev) => !prev)}
                  title={lang === "my" ? "ဂဏန်းခလုတ်ခုံ" : "Number Pad"}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-black transition-all ${
                    showDialPad
                      ? "bg-[#1828F5] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Keyboard className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {lang === "my" ? "ခလုတ်ခုံ" : "Keypad"}
                  </span>
                </button>
              </div>

              {/* Collapsible Elderly-Friendly Tactile Dial Pad */}
              {showDialPad && (
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white/90 p-3 shadow-inner">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                    (digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handlePhoneKeyPress(digit)}
                        className="dialpad-btn flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-black text-slate-950 shadow-xs active:scale-95"
                      >
                        {digit}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setPhoneInput("")}
                    className="dialpad-btn flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-xs font-extrabold text-slate-800 active:scale-95"
                  >
                    {lang === "my" ? "ဖုန်းဖျက်" : "CLEAR"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhoneKeyPress("0")}
                    className="dialpad-btn flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-black text-slate-950 shadow-xs active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    aria-label="Delete last digit"
                    className="dialpad-btn flex min-h-[46px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-slate-900 active:scale-95"
                  >
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
              )}

              {authError && (
                <div className="rounded-2xl border-2 border-red-700 bg-red-50 p-3 text-xs font-extrabold text-red-900 sm:text-sm">
                  {authError}
                </div>
              )}

              {/* Vibrant Royal Blue Pill CTA Button (Exact Match to Screenshots 1–4) */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-[#1828F5] px-6 py-3.5 text-base font-black text-white shadow-xl transition-all hover:bg-[#1320C4] active:scale-[0.99] sm:text-lg"
              >
                <span>
                  {isLoggingIn
                    ? lang === "my"
                      ? "ချိတ်ဆက်နေပါသည်..."
                      : "Signing In..."
                    : loginMode === "register_or_phone"
                    ? lang === "my"
                      ? "အကောင့်ဝင်မည် / လူနာ ID ရယူမည်"
                      : "Create Account / Log in"
                    : lang === "my"
                    ? "လူနာ ID ဖြင့် အကောင့်ဟောင်းဝင်မည်"
                    : "Verify & Log in"}
                </span>
                <ArrowRight className="h-5 w-5 shrink-0" />
              </button>
            </form>

            {/* Bottom Translucent White Toggle Box (Exact Match to "Have an account? Log in" in Screenshots 1 & 4) */}
            <div className="mt-4 rounded-2xl bg-white/75 p-3.5 text-center shadow-sm backdrop-blur-xs">
              {loginMode === "register_or_phone" ? (
                <p className="text-xs font-bold text-slate-800 sm:text-sm">
                  {lang === "my"
                    ? "လူနာ ID နံပါတ် ရှိပြီးသားလား? "
                    : "Already have a Patient ID? "}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode("returning_id");
                      setAuthError("");
                    }}
                    className="font-black text-[#1828F5] underline underline-offset-4"
                  >
                    {lang === "my"
                      ? "လူနာ ID ဖြင့် ဝင်ရန်"
                      : "Log in with ID"}
                  </button>
                </p>
              ) : (
                <p className="text-xs font-bold text-slate-800 sm:text-sm">
                  {lang === "my"
                    ? "အကောင့်အသစ် သို့မဟုတ် ဖုန်းဖြင့် ဝင်လိုပါသလား? "
                    : "No Patient ID yet? "}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode("register_or_phone");
                      setAuthError("");
                    }}
                    className="font-black text-[#1828F5] underline underline-offset-4"
                  >
                    {lang === "my"
                      ? "အမည် + ဖုန်းဖြင့် ဝင်ရန်"
                      : "Sign up / Phone Login"}
                  </button>
                </p>
              )}
              <p className="mt-1 text-[11px] font-semibold text-slate-600">
                {lang === "my"
                  ? "💡 ဖုန်းနံပါတ်ပြောင်းသွားပါက လူနာ ID နှင့် မှတ်ပုံတင်ကို Reception တွင်ပြ၍ ပွိုင့်ပြန်ယူနိုင်ပါသည်။"
                  : "💡 Changed phone? Show your Patient ID & NRC at Reception to keep your points."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer APK Download Link on Login Screen too */}
        <footer className="mt-6 text-center text-xs font-bold text-slate-600">
          <a
            href="/downloads/Clinic-Patient-Android.apk"
            download="Clinic-Patient-Android.apk"
            className="text-[#1828F5] underline underline-offset-4 hover:text-blue-900"
          >
            {lang === "my"
              ? "ဖုန်းထဲတွင် အသုံးပြုရန် လူနာ Android App (.apk) ဒေါင်းလုဒ်ဆွဲရန်"
              : "Download Patient Android App (.apk)"}
          </a>
        </footer>
      </div>
    );
  }

  const patientIdCardModalElement = showPatientIdModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-slate-300 bg-white shadow-2xl">
        {/* Royal Header */}
        <div className="bg-gradient-to-r from-[#1828F5] via-indigo-800 to-slate-900 p-5 text-white sm:p-6">
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
              className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1828F5] px-4 py-2.5 text-sm font-black text-white shadow-md hover:opacity-95"
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
  // BOTTOM NAVIGATION DOCK (Matching Screenshot 5's White Rounded Bottom Bar)
  // ============================================================================
  const bottomNavigationDock = (
    <div className="sticky bottom-3 z-30 mx-auto mt-8 max-w-md px-3">
      <div className="flex items-center justify-around rounded-[26px] border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setView("doctors")}
          className={`flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[11px] font-black transition-all ${
            view === "doctors"
              ? "bg-blue-50 text-[#1828F5]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className="h-5 w-5" />
          <span>{lang === "my" ? "ဆရာဝန်များ" : "Home"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeBooking) {
              setView("tracker");
            } else {
              setView("doctors");
            }
          }}
          className={`relative flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[11px] font-black transition-all ${
            view === "tracker"
              ? "bg-blue-50 text-[#1828F5]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Ticket className="h-5 w-5" />
          <span>{lang === "my" ? "အလှည့်ကြည့်ရန်" : "My Queue"}</span>
          {activeBooking && (
            <span className="absolute -top-1 right-1 rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-black text-white">
              #{activeBooking.queue_number}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowPatientIdModal(true)}
          className="flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[11px] font-black text-slate-500 transition-all hover:text-slate-900"
        >
          <QrCode className="h-5 w-5 text-[#1828F5]" />
          <span>{lang === "my" ? "လူနာ ID ကတ်" : "ID Card"}</span>
        </button>

        <button
          type="button"
          onClick={handleEnablePushNotifications}
          className={`flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1.5 text-[11px] font-black transition-all ${
            notificationEnabled
              ? "text-emerald-700"
              : "text-amber-600 hover:text-amber-700"
          }`}
        >
          <Bell className="h-5 w-5" />
          <span>{lang === "my" ? "'တီ' အသံစနစ်" : "Beep Alert"}</span>
        </button>
      </div>
    </div>
  );

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
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm">
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
              <PlusCircle className="h-4 w-4 text-[#1828F5]" />
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
                : "border-blue-400 bg-gradient-to-br from-[#1828F5] via-indigo-700 to-blue-900"
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
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1828F5]">
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
            <div className="inline-flex items-center gap-2 self-start rounded-2xl bg-[#1828F5] px-4 py-2.5 text-sm font-black text-white shadow-sm sm:text-base">
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
              <Clock className="h-8 w-8 shrink-0 text-[#1828F5]" />
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
              <MessageSquareHeart className="h-6 w-6 shrink-0 text-[#1828F5]" />
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
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#1828F5] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:opacity-95"
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

        {bottomNavigationDock}
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
        {patientIdCardModalElement}
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
          <div className="bg-gradient-to-r from-[#1828F5] via-indigo-800 to-slate-900 p-5 text-white sm:p-6">
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
                    <Upload className="mb-2 h-7 w-7 text-[#1828F5]" />
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
              className="mt-6 flex min-h-[58px] w-full items-center justify-center gap-3 rounded-full bg-[#1828F5] px-6 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-[#1320C4] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[64px] sm:text-xl"
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

        {bottomNavigationDock}
      </div>
    );
  }

  // ============================================================================
  // 4. FIGMA-STYLE PATIENT HOME DASHBOARD (Exact Match to Screenshot 5)
  // ============================================================================
  const visibleServiceCards = showAllServices
    ? serviceCategories
    : serviceCategories.slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-7">
      {patientIdCardModalElement}

      {/* Main Soft Sage-Tinted Dashboard Container (Matching Screenshot 5's card canvas) */}
      <div className="rounded-[34px] border border-emerald-200/70 bg-gradient-to-b from-[#DFEFE2] via-[#EBF5EC] to-[#F3F8F4] p-4 shadow-lg sm:p-7">
        {/* Cancel / Refund Notification Banner */}
        {cancelNotice && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-3xl border-2 border-emerald-700 bg-white p-4 text-emerald-950 shadow-md">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Bell className="h-5 w-5 text-emerald-700" />
              <span className="text-xs font-black text-emerald-950 sm:text-sm">
                {lang === "my"
                  ? `သင့်တွင် အလှည့်နံပါတ် (#${activeBooking.queue_number}) ရှိနေပါသည်`
                  : `Active Queue Pass #${activeBooking.queue_number}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setView("tracker")}
              className="rounded-xl bg-[#1828F5] px-3.5 py-2 text-xs font-black text-white shadow-xs hover:opacity-95"
            >
              {lang === "my"
                ? "တိုက်ရိုက် အလှည့်ကြည့်ရန် →"
                : "Open Live Tracker →"}
            </button>
          </div>
        )}

        {/* 1. TOP PROFILE & GREETING BAR ("Hello, [Patient Name]!" + Avatar + Bell) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* Circular Patient Avatar (Matching Screenshot 5 top-left) */}
            <button
              type="button"
              onClick={() => setShowPatientIdModal(true)}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#1828F5] bg-gradient-to-br from-blue-100 to-indigo-200 shadow-md sm:h-16 sm:w-16"
            >
              <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
                <circle cx="32" cy="24" r="12" fill="#FDBA74" />
                <path
                  d="M20 22C20 13 25 9 32 9C39 9 44 13 44 22C40 17 36 15 32 15C28 15 24 17 20 22Z"
                  fill="#1E293B"
                />
                <path
                  d="M12 62C12 46 20 39 32 39C44 39 52 46 52 62H12Z"
                  fill="#1828F5"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-slate-950 sm:text-2xl">
                {lang === "my"
                  ? `Hello, ${currentPatient.name}!`
                  : `Hello, ${currentPatient.name}!`}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPatientIdModal(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1828F5] px-2.5 py-0.5 font-mono text-[11px] font-black text-white shadow-xs hover:opacity-90"
                >
                  <QrCode className="h-3 w-3 text-amber-300" />
                  <span>ID: {currentPatient.patient_code}</span>
                </button>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/30 bg-white px-2.5 py-0.5 text-[11px] font-black text-emerald-900 shadow-xs">
                  <Wallet className="h-3 w-3 text-emerald-700" />
                  <span>{formatCurrency(currentPatient.credit_points, lang)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Notification Bell + Patient QR Card Shortcut */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPatientIdModal(true)}
              className="hidden min-h-[44px] items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-black text-slate-900 shadow-xs hover:bg-slate-50 sm:inline-flex"
            >
              <QrCode className="h-4 w-4 text-[#1828F5]" />
              <span>
                {lang === "my" ? "လူနာ ID / QR ကတ်" : "Patient ID Card"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleEnablePushNotifications}
              title={
                lang === "my"
                  ? "ဖုန်းသတိပေးချက်နှင့် 'တီ' အသံစနစ် ဖွင့်ရန်/စမ်းရန်"
                  : "Enable / Test Push & Beep Alerts"
              }
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-md transition-transform active:scale-95"
            >
              <Bell className="h-6 w-6 text-amber-500 fill-amber-400" />
              <span
                className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                  notificationEnabled ? "bg-emerald-500" : "bg-red-500 animate-ping"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 2. ROUNDED WHITE SEARCH & FILTER BAR (Exact Match to Screenshot 5) */}
        <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-md">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <input
            type="text"
            value={doctorSearchQuery}
            onChange={(e) => setDoctorSearchQuery(e.target.value)}
            placeholder={
              lang === "my"
                ? "Search (ဆရာဝန်အမည်၊ ကုဒ် သို့မဟုတ် အထူးကု ရှာရန်...)"
                : "Search doctor name, code, or specialty..."
            }
            className="w-full bg-transparent text-sm font-extrabold text-slate-950 placeholder:text-slate-400 focus:outline-none sm:text-base"
          />
          {doctorSearchQuery ? (
            <button
              type="button"
              onClick={() => setDoctorSearchQuery("")}
              className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAllServices((prev) => !prev)}
              className="rounded-xl p-1 text-slate-700 hover:bg-slate-100"
              title={lang === "my" ? "အထူးကုဘာသာရပ်များ စစ်ထုတ်ရန်" : "Filter Services"}
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 3. `SERVICES` SECTION WITH ROYAL BLUE SQUARE ICON CARDS + `SEE ALL >` */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black tracking-wider text-slate-950 uppercase sm:text-base">
              {lang === "my" ? "SERVICES • အထူးကု ဝန်ဆောင်မှုများ" : "SERVICES"}
            </h2>
            <button
              type="button"
              onClick={() => setShowAllServices((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full bg-[#81C784]/50 px-3 py-1 text-xs font-black text-slate-900 transition-colors hover:bg-[#81C784]/80"
            >
              <span>
                {showAllServices
                  ? lang === "my"
                    ? "အကျဉ်းချုပ်ပြရန်"
                    : "SHOW LESS"
                  : lang === "my"
                  ? "SEE ALL >"
                  : "SEE ALL >"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 sm:gap-3">
            {visibleServiceCards.map((srv) => {
              const isSelected = selectedServiceCategory === srv.id;
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() =>
                    setSelectedServiceCategory((prev) =>
                      prev === srv.id && srv.id !== "all" ? "all" : srv.id
                    )
                  }
                  className={`group flex flex-col items-center rounded-2xl p-2.5 text-center transition-all active:scale-95 sm:p-3 ${
                    isSelected
                      ? "bg-[#1828F5] text-white ring-4 ring-blue-400/50 shadow-lg"
                      : "bg-[#1828F5]/90 text-white shadow-md hover:bg-[#1828F5]"
                  }`}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 sm:h-12 sm:w-12">
                    <ServiceCategoryIcon type={srv.icon} />
                  </div>
                  <span className="mt-1.5 line-clamp-1 text-[11px] font-extrabold text-white sm:text-xs">
                    {lang === "my" ? srv.labelMy : srv.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Latest Clinic / Reception Announcements Feed (if any) */}
        {messages.filter((m) => !m.patient_id || m.patient_id === currentPatient.id)
          .length > 0 && (
          <div className="mt-5 rounded-3xl border border-blue-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageSquareHeart className="h-4 w-4 text-[#1828F5]" />
                <h3 className="text-xs font-black text-slate-950 sm:text-sm">
                  {lang === "my"
                    ? "Reception မှ နောက်ဆုံးပေးပို့သော သတိပေးချက်များ"
                    : "Latest Announcements from Reception"}
                </h3>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900">
                LIVE
              </span>
            </div>
            <div className="space-y-1.5">
              {messages
                .filter((m) => !m.patient_id || m.patient_id === currentPatient.id)
                .slice(0, 2)
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-2xl bg-slate-50 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-950">
                        {lang === "my" ? msg.title_my : msg.title_en}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 font-bold text-slate-700">
                      {lang === "my" ? msg.body_my : msg.body_en}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 4. `DOCTORS` SECTION WITH HORIZONTAL WHITE CARDS & ROYAL BLUE `[→]` BUTTON */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black tracking-wider text-slate-950 uppercase sm:text-base">
              {lang === "my"
                ? `DOCTORS • ယနေ့ ဆရာဝန်ကြီးများ (${activeDoctorsList.length})`
                : `DOCTORS (${activeDoctorsList.length})`}
            </h2>
            {selectedServiceCategory !== "all" && (
              <button
                type="button"
                onClick={() => setSelectedServiceCategory("all")}
                className="text-xs font-black text-[#1828F5] underline"
              >
                {lang === "my" ? "အားလုံးပြန်ပြရန်" : "Reset Filter"}
              </button>
            )}
          </div>

          {activeDoctorsList.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Stethoscope className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-2 text-sm font-black text-slate-800 sm:text-base">
                {lang === "my"
                  ? "ရှာဖွေထားသော အထူးကုဆရာဝန် မတွေ့ရှိသေးပါ။"
                  : "No matching doctors found."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDoctorSearchQuery("");
                  setSelectedServiceCategory("all");
                }}
                className="mt-3 rounded-xl bg-[#1828F5] px-4 py-2 text-xs font-black text-white"
              >
                {lang === "my" ? "ဆရာဝန်အားလုံး ပြန်ကြည့်မည်" : "Show All Doctors"}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeDoctorsList.map((doctor, idx) => {
                const waitingCount = bookings.filter(
                  (b) =>
                    b.doctor_id === doctor.id &&
                    (b.status === "waiting" || b.status === "in_progress")
                ).length;

                const isPostponed = doctor.status === "postponed";
                const isDelayed = doctor.status === "delayed";
                const isAvailable = doctor.status === "available";

                return (
                  <div
                    key={doctor.id}
                    className={`flex flex-col justify-between gap-4 rounded-[28px] bg-white p-4 shadow-md transition-all sm:flex-row sm:items-center sm:p-5 ${
                      isPostponed
                        ? "border-2 border-red-200 opacity-85"
                        : "hover:shadow-xl"
                    }`}
                  >
                    {/* Left + Center: Doctor Avatar Illustration + Details */}
                    <div className="flex min-w-0 items-start gap-3.5 sm:items-center sm:gap-4">
                      <DoctorVectorAvatar
                        index={idx}
                        isAvailable={isAvailable}
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Doctor Name */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-950 sm:text-xl">
                            {lang === "my"
                              ? doctor.name_my || doctor.name
                              : doctor.name}
                          </h3>
                          {doctor.doctor_code && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-black text-slate-800">
                              {doctor.doctor_code}
                            </span>
                          )}
                        </div>

                        {/* Italic Specialty Subtitle (Exact Match to Screenshot 5) */}
                        <p className="text-xs font-bold italic text-slate-600 sm:text-sm">
                          {lang === "my"
                            ? doctor.specialty_my || doctor.specialty
                            : doctor.specialty}
                        </p>

                        {/* Consultation Timings & Room */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-extrabold text-slate-800">
                          {doctor.start_time && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock className="h-3.5 w-3.5 text-[#1828F5]" />
                              {doctor.end_time
                                ? `${doctor.start_time} - ${doctor.end_time}`
                                : doctor.start_time}
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-900">
                            {lang === "my"
                              ? `အခန်း ${doctor.room_number}`
                              : `Room ${doctor.room_number}`}
                          </span>
                        </div>

                        {/* Live Queue Status + Rating/Fee Row */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {/* Star + Consultation Fee Pill */}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-black text-slate-900">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            <span>
                              {formatCurrency(doctor.consultation_fee, lang)}
                            </span>
                          </span>

                          {/* Current Queue / Arrival Status Badge */}
                          {doctor.status === "not_arrived" ||
                          doctor.current_queue_number === 0 ? (
                            <span className="rounded-lg bg-sky-100 px-2.5 py-0.5 text-[11px] font-black text-sky-950">
                              {lang === "my"
                                ? "မရောက်သေးပါ (ကြိုတင်ဘိုကင်ယူနိုင်သည်)"
                                : "Not Arrived (#1 on arrival)"}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-950">
                              {lang === "my"
                                ? `ယခုပြသနေသော နံပါတ် #${doctor.current_queue_number}`
                                : `Now Serving #${doctor.current_queue_number}`}
                            </span>
                          )}

                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                            {lang === "my"
                              ? `စောင့်ဆိုင်းသူ (${waitingCount}) ဦး`
                              : `${waitingCount} waiting`}
                          </span>

                          {isDelayed && (
                            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-950">
                              {lang === "my"
                                ? `${doctor.delay_minutes} မိနစ် နောက်ကျမည်`
                                : `Delayed ${doctor.delay_minutes}m`}
                            </span>
                          )}
                          {isPostponed && (
                            <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-900">
                              {lang === "my"
                                ? `ရက်ရွှေ့ဆိုင်း (${doctor.postponed_to || "TBA"})`
                                : `Postponed (${doctor.postponed_to || "TBA"})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Edge: Signature Vibrant Royal Blue Arrow Button (`[→]`) from Screenshot 5 */}
                    <button
                      type="button"
                      disabled={isPostponed}
                      onClick={() => {
                        setSelectedDoctorId(doctor.id);
                        setView("checkout");
                      }}
                      className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 self-end rounded-2xl bg-[#1828F5] px-4 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-[#1320C4] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-h-[54px] sm:self-center sm:px-5"
                    >
                      <span className="sm:hidden">
                        {isPostponed
                          ? lang === "my"
                            ? "ရွှေ့ဆိုင်း"
                            : "Closed"
                          : lang === "my"
                          ? "အလှည့်ယူမည်"
                          : "Book"}
                      </span>
                      <span className="hidden sm:inline">
                        {isPostponed
                          ? lang === "my"
                            ? "ရွှေ့ဆိုင်း"
                            : "Postponed"
                          : lang === "my"
                          ? "အလှည့်ယူမည်"
                          : "Book"}
                      </span>
                      {!isPostponed && <ArrowRight className="h-5 w-5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Navigation Dock inside the Dashboard */}
        {bottomNavigationDock}
      </div>

      {/* Subtle Footer with Patient Android App Download Link */}
      <footer className="mt-6 pt-2 pb-4 text-center text-xs font-bold text-slate-600">
        <a
          href="/downloads/Clinic-Patient-Android.apk"
          download="Clinic-Patient-Android.apk"
          className="text-[#1828F5] underline underline-offset-4 hover:text-blue-900"
        >
          {lang === "my"
            ? "ဖုန်းထဲတွင် အသုံးပြုရန် လူနာ Android App (.apk) ဒေါင်းလုဒ်ဆွဲရန်"
            : "Download Patient Android App (.apk)"}
        </a>
      </footer>
    </div>
  );
}
