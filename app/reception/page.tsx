"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useClinic, DoctorFormInput } from "@/lib/clinic-store";
import { Doctor, DoctorStatus } from "@/lib/types";
import { MANUAL_TEMPLATES } from "@/lib/messages";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  BellRing,
  CheckCircle2,
  XCircle,
  Eye,
  Volume2,
  RefreshCw,
  Clock,
  Wallet,
  CreditCard,
  ShieldAlert,
  Building2,
  Lock,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  CalendarClock,
  Share2,
  Check,
  Send,
  UserPlus,
  Crown,
  QrCode,
  Hash,
  MessageSquarePlus,
} from "lucide-react";

const STAFF_AUTH_STORAGE_KEY = "auracare_staff_authenticated_v1";
const DEFAULT_STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || "1234";

export default function ReceptionCommandCenterPage() {
  const {
    lang,
    patients,
    doctors,
    bookings,
    transactions,
    messages,
    advanceDoctorQueue,
    setCustomQueueNumber,
    verifyReceiptAndConfirmBooking,
    cancelBookingAndRefund,
    addDoctor,
    updateDoctor,
    removeDoctor,
    updateDoctorSessionStatus,
    sendClinicMessage,
    createWalkInBooking,
  } = useClinic();

  // Staff PIN Security Gate
  const [isStaffAuthed, setIsStaffAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STAFF_AUTH_STORAGE_KEY) === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Action Banner & Modals
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [inspectReceiptUrl, setInspectReceiptUrl] = useState<string | null>(
    null
  );
  const [copiedLinkDoctorId, setCopiedLinkDoctorId] = useState<string | null>(
    null
  );

  // 1. Add / Edit Doctor Modal State
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorFormInput>({
    name: "",
    name_my: "",
    specialty: "",
    specialty_my: "",
    room_number: "101",
    consultation_fee: 15000,
    start_time: "09:00",
    end_time: "12:00",
    avg_consult_minutes: 10,
  });

  // 2. Doctor Status / Postpone / Delay Modal State
  const [statusModalDoctor, setStatusModalDoctor] = useState<Doctor | null>(
    null
  );
  const [statusChoice, setStatusChoice] = useState<DoctorStatus>("available");
  const [delayMinutesInput, setDelayMinutesInput] = useState<number>(30);
  const [postponedToInput, setPostponedToInput] = useState<string>("");
  const [statusNoteInput, setStatusNoteInput] = useState<string>("");

  // 3. Custom Queue Override Modal State
  const [overrideModalDoctor, setOverrideModalDoctor] = useState<Doctor | null>(
    null
  );
  const [overrideQueueValue, setOverrideQueueValue] = useState<number>(1);

  // 4. VIP / Walk-In Patient Registration Modal State
  const [walkInModalDoctor, setWalkInModalDoctor] = useState<Doctor | null>(
    null
  );
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("09");
  const [walkInPriority, setWalkInPriority] = useState(false);
  const [walkInPayment, setWalkInPayment] = useState<
    "cash" | "kpay" | "wavepay" | "ayapay"
  >("cash");
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  // 5. Manual Broadcast Message Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastDoctorId, setBroadcastDoctorId] = useState<string>("all");
  const [broadcastTitleMy, setBroadcastTitleMy] = useState("");
  const [broadcastBodyMy, setBroadcastBodyMy] = useState("");
  const [broadcastTitleEn, setBroadcastTitleEn] = useState("");
  const [broadcastBodyEn, setBroadcastBodyEn] = useState("");

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === DEFAULT_STAFF_PIN) {
      sessionStorage.setItem(STAFF_AUTH_STORAGE_KEY, "true");
      setIsStaffAuthed(true);
      setPinError("");
    } else {
      setPinError(
        lang === "my"
          ? "ဝန်ထမ်း PIN နံပါတ် မှားယွင်းနေပါသည် (စမ်းသပ်ရန် 1234)"
          : "Invalid Staff PIN. Use 1234 for demo."
      );
    }
  };

  const handleLockConsole = () => {
    sessionStorage.removeItem(STAFF_AUTH_STORAGE_KEY);
    setIsStaffAuthed(false);
    setPinInput("");
  };

  if (!isStaffAuthed) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black">
              {lang === "my"
                ? "Reception ဝန်ထမ်း ဝင်ရောက်ရန်"
                : "Reception Staff Access"}
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-300">
              {lang === "my"
                ? "ဆေးခန်း စီမံခန့်ခွဲမှုစနစ်သို့ ဝင်ရန် ဝန်ထမ်း PIN နံပါတ် ရိုက်ထည့်ပါ။"
                : "Authorized clinic staff only. Enter PIN to unlock Reception Console."}
            </p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "ဝန်ထမ်း PIN နံပါတ် (Demo: 1234)"
                  : "Staff Security PIN (Demo: 1234)"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                placeholder="••••"
                className="min-h-[56px] w-full rounded-2xl border-2 border-slate-900 bg-slate-50 px-4 text-center text-2xl font-black tracking-widest text-slate-950 focus:outline-none"
              />
            </div>
            {pinError && (
              <div className="rounded-xl border-2 border-red-700 bg-red-50 p-3 text-sm font-extrabold text-red-900">
                {pinError}
              </div>
            )}
            <button
              type="submit"
              className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-3.5 text-lg font-black text-white shadow-md hover:opacity-95"
            >
              {lang === "my"
                ? "Reception စနစ် ဖွင့်မည်"
                : "Unlock Reception Console"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Handlers
  const handleAdvanceQueue = async (doctorId: string, doctorName: string) => {
    const res = await advanceDoctorQueue(doctorId);
    const alertMsg =
      res.notifiedPatients.length > 0
        ? `${doctorName} -> #${res.newQueueNumber} | FCM & Message ပို့ပြီး - ${res.notifiedPatients.join(", ")}`
        : `${doctorName} -> #${res.newQueueNumber} သို့ ပြောင်းလဲပြီးပါပြီ။`;
    setLastAnnouncement(alertMsg);
  };

  const handleCopyDirectBookingLink = (doctor: Doctor) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/?doctor=${doctor.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLinkDoctorId(doctor.id);
    setLastAnnouncement(
      `${doctor.name_my} အတွက် တိုက်ရိုက် Booking လင့်ခ် (${url}) ကို ကူးယူပြီးပါပြီ။ Viber / SMS မှ ပေးပို့နိုင်ပါပြီ။`
    );
    setTimeout(() => setCopiedLinkDoctorId(null), 2500);
  };

  const openAddDoctorModal = () => {
    setEditingDoctor(null);
    setDoctorForm({
      name: "",
      name_my: "",
      specialty: "",
      specialty_my: "",
      room_number: "103",
      consultation_fee: 15000,
      start_time: "09:00",
      end_time: "12:00",
      avg_consult_minutes: 10,
    });
    setIsDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setDoctorForm({
      name: doc.name,
      name_my: doc.name_my || doc.name,
      specialty: doc.specialty,
      specialty_my: doc.specialty_my || doc.specialty,
      room_number: doc.room_number,
      consultation_fee: doc.consultation_fee,
      start_time: doc.start_time,
      end_time: doc.end_time,
      avg_consult_minutes: doc.avg_consult_minutes,
    });
    setIsDoctorModalOpen(true);
  };

  const handleSaveDoctorForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name_my && !doctorForm.name) return;
    const payload: DoctorFormInput = {
      ...doctorForm,
      name: doctorForm.name || doctorForm.name_my,
      name_my: doctorForm.name_my || doctorForm.name,
      specialty: doctorForm.specialty || doctorForm.specialty_my,
      specialty_my: doctorForm.specialty_my || doctorForm.specialty,
    };

    if (editingDoctor) {
      await updateDoctor(editingDoctor.id, payload);
      setLastAnnouncement(
        `${payload.name_my} ၏ အချက်အလက်များကို ပြင်ဆင်ပြီးပါပြီ။`
      );
    } else {
      await addDoctor(payload);
      setLastAnnouncement(
        `ဆရာဝန်အသစ် (${payload.name_my}) ကို စာရင်းသွင်းပြီးပါပြီ။`
      );
    }
    setIsDoctorModalOpen(false);
  };

  const handleRemoveDoctor = async (doc: Doctor) => {
    await removeDoctor(doc.id);
    setLastAnnouncement(`${doc.name_my} ကို စာရင်းမှ ဖယ်ရှားပြီးပါပြီ။`);
  };

  const openStatusModal = (doc: Doctor) => {
    setStatusModalDoctor(doc);
    setStatusChoice(doc.status);
    setDelayMinutesInput(doc.delay_minutes || 30);
    setPostponedToInput(doc.postponed_to || "");
    setStatusNoteInput(doc.status_note || "");
  };

  const handleSaveDoctorStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalDoctor) return;
    await updateDoctorSessionStatus(statusModalDoctor.id, {
      status: statusChoice,
      delayMinutes: statusChoice === "delayed" ? delayMinutesInput : 0,
      postponedTo: statusChoice === "postponed" ? postponedToInput : null,
      note: statusNoteInput || null,
    });
    setLastAnnouncement(
      `${statusModalDoctor.name_my} ၏ အခြေအနေကို ပြောင်းလဲပြီး သက်ဆိုင်ရာ လူနာများထံ အလိုအလျောက် Message ပေးပို့ပြီးပါပြီ။`
    );
    setStatusModalDoctor(null);
  };

  const handleSaveQueueOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalDoctor) return;
    await setCustomQueueNumber(overrideModalDoctor.id, overrideQueueValue);
    setLastAnnouncement(
      `${overrideModalDoctor.name_my} ၏ လက်ရှိ အလှည့်နံပါတ်ကို #${overrideQueueValue} သို့ သတ်မှတ်ပြီးပါပြီ။`
    );
    setOverrideModalDoctor(null);
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInModalDoctor || !walkInName.trim()) return;
    const booking = await createWalkInBooking({
      doctorId: walkInModalDoctor.id,
      patientName: walkInName.trim(),
      patientPhone: walkInPhone.trim() || "0900000000",
      isPriority: walkInPriority,
      paymentMethod: walkInPayment,
    });
    setCreatedTicketId(booking.id);
    setLastAnnouncement(
      `ပြင်ပလူနာ (${walkInName}) အတွက် အလှည့်နံပါတ် #${booking.queue_number} နှင့် QR လက်မှတ် ထုတ်ပေးပြီးပါပြီ။`
    );
  };

  const handleSendManualBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastBodyMy.trim() && !broadcastBodyEn.trim()) return;
    await sendClinicMessage({
      doctorId: broadcastDoctorId === "all" ? null : broadcastDoctorId,
      titleMy: broadcastTitleMy || "ဆေးခန်းမှ အသိပေးချက်",
      bodyMy: broadcastBodyMy || broadcastBodyEn,
      titleEn: broadcastTitleEn || "Clinic Announcement",
      bodyEn: broadcastBodyEn || broadcastBodyMy,
      kind: "manual",
    });
    setLastAnnouncement(
      "လူနာများထံသို့ တိုက်ရိုက် အသိပေးချက် (Message) ပေးပို့ပြီးပါပြီ။"
    );
    setIsBroadcastModalOpen(false);
    setBroadcastTitleMy("");
    setBroadcastBodyMy("");
    setBroadcastTitleEn("");
    setBroadcastBodyEn("");
  };

  const handleCancelAndRefund = async (bookingId: string) => {
    const res = await cancelBookingAndRefund(bookingId);
    setLastAnnouncement(
      `${res.patientName} ၏ ရက်ချိန်းကို ပယ်ဖျက်ပြီး ${formatCurrency(
        res.refundedAmount,
        lang
      )} ကို Credit Points အဖြစ် အလိုအလျောက် ပြောင်းပေးပြီးပါပြီ။`
    );
  };

  const activeDoctors = doctors.filter((d) => !d.is_archived);
  const activeBookings = bookings.filter(
    (b) => b.status === "waiting" || b.status === "in_progress"
  );
  const pendingVerifications = activeBookings.filter(
    (b) => b.payment_status === "pending"
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {/* Top Command Center Gradient Header */}
      <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
              <Volume2 className="h-4 w-4" />
              <span>
                {lang === "my"
                  ? "Reception ဗဟိုထိန်းချုပ်ရေး စင်တာ"
                  : "Reception Command Center"}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {lang === "my"
                ? "ဆရာဝန်များ၊ အလှည့်နံပါတ်နှင့် ငွေစာရင်း စီမံခန့်ခွဲမှု"
                : "Multi-Doctor Live Queue & Financial Control"}
            </h1>
            <p className="mt-1 text-sm font-bold text-slate-300 sm:text-base">
              {lang === "my"
                ? "ဆရာဝန်အသစ်ထည့်ခြင်း၊ အချိန်ရွှေ့ဆိုင်းခြင်း၊ သက်ဆိုင်ရာ ဆရာဝန်အလိုက် လူနာများထံ Message ပို့ခြင်းနှင့် QR လက်မှတ်ထုတ်ပေးခြင်းများကို တစ်နေရာတည်းမှ ပြုလုပ်နိုင်ပါသည်။"
                : "Manage doctors, advance queues, broadcast doctor-specific patient alerts, and verify KPay/WavePay/AYA Pay receipts."}
            </p>
          </div>

          {/* Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openAddDoctorModal}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:opacity-95"
            >
              <Plus className="h-5 w-5" />
              <span>
                {lang === "my" ? "ဆရာဝန်အသစ် ထည့်မည်" : "Add Doctor"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:opacity-95"
            >
              <MessageSquarePlus className="h-5 w-5" />
              <span>
                {lang === "my"
                  ? "လူနာထံ Message ပို့မည်"
                  : "Broadcast Message"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLockConsole}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
              <span>{lang === "my" ? "PIN ပိတ်မည်" : "Lock"}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Row */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5">
            <span className="text-xs font-bold uppercase text-sky-200">
              {lang === "my" ? "တာဝန်ကျ ဆရာဝန်" : "Active Doctors"}
            </span>
            <p className="mt-1 text-2xl font-black">{activeDoctors.length}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3.5">
            <span className="text-xs font-bold uppercase text-sky-200">
              {lang === "my" ? "စောင့်ဆိုင်းနေသော လူနာ" : "Waiting Patients"}
            </span>
            <p className="mt-1 text-2xl font-black">{activeBookings.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/20 p-3.5">
            <span className="text-xs font-bold uppercase text-amber-200">
              {lang === "my" ? "ပြေစာ စစ်ဆေးရန်ကျန်" : "Pending Receipts"}
            </span>
            <p className="mt-1 text-2xl font-black text-amber-300">
              {pendingVerifications.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/20 p-3.5">
            <span className="text-xs font-bold uppercase text-emerald-200">
              {lang === "my" ? "ပေးပို့ပြီး Message" : "Messages Sent"}
            </span>
            <p className="mt-1 text-2xl font-black text-emerald-300">
              {messages.length}
            </p>
          </div>
        </div>
      </div>

      {/* Live Action Feedback Toast */}
      {lastAnnouncement && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border-2 border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 text-emerald-950 shadow-sm">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 shrink-0 text-emerald-700" />
            <p className="text-base font-extrabold">{lastAnnouncement}</p>
          </div>
          <button
            type="button"
            onClick={() => setLastAnnouncement(null)}
            className="rounded-lg border border-emerald-700 px-3 py-1 text-xs font-black"
          >
            OK
          </button>
        </div>
      )}

      {/* =====================================================================
          SECTION 1: MULTI-DOCTOR LIVE GRID & DOCTOR CRUD / POSTPONE / LINKS
      ===================================================================== */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">
          {lang === "my"
            ? "၁။ ဆရာဝန်အလိုက် တိုက်ရိုက် အလှည့်ထိန်းချုပ်မှု"
            : "1. Multi-Doctor Live Queue Grid"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {activeDoctors.map((doctor) => {
          const doctorQueue = activeBookings
            .filter((b) => b.doctor_id === doctor.id)
            .sort((a, b) => a.queue_number - b.queue_number);

          return (
            <div
              key={doctor.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md"
            >
              {/* Doctor Card Top Bar */}
              <div className="border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1 text-xs font-black uppercase text-white">
                        <Building2 className="h-3.5 w-3.5" />
                        {lang === "my"
                          ? `အခန်း ${doctor.room_number}`
                          : `Room ${doctor.room_number}`}
                      </span>
                      <span className="rounded-xl bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-950">
                        {doctor.start_time} – {doctor.end_time}
                      </span>
                      {doctor.status === "available" && (
                        <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900">
                          {lang === "my" ? "● ထိုင်နေသည်" : "● Available"}
                        </span>
                      )}
                      {doctor.status === "delayed" && (
                        <span className="rounded-xl bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950">
                          {lang === "my"
                            ? `● ${doctor.delay_minutes} မိနစ် နောက်ကျ`
                            : `● Delayed ${doctor.delay_minutes}m`}
                        </span>
                      )}
                      {doctor.status === "postponed" && (
                        <span className="rounded-xl bg-red-100 px-2.5 py-1 text-xs font-black text-red-900">
                          {lang === "my"
                            ? `● ရက်ရွှေ့ထားသည် (${
                                doctor.postponed_to || "TBA"
                              })`
                            : `● Postponed (${doctor.postponed_to || "TBA"})`}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      {lang === "my" ? doctor.name_my : doctor.name}
                    </h3>
                    <p className="text-sm font-bold text-clinic-primary">
                      {lang === "my" ? doctor.specialty_my : doctor.specialty} •{" "}
                      {formatCurrency(doctor.consultation_fee, lang)}
                    </p>
                  </div>

                  {/* Current Serving Badge + Override Button */}
                  <div className="flex flex-col items-end">
                    <div className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-4 py-2 text-center">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        {lang === "my" ? "လက်ရှိအလှည့်" : "Now Serving"}
                      </span>
                      <span className="text-4xl font-black text-emerald-950">
                        #{doctor.current_queue_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideModalDoctor(doctor);
                        setOverrideQueueValue(doctor.current_queue_number);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-extrabold text-blue-800 hover:underline"
                    >
                      <Hash className="h-3.5 w-3.5" />
                      <span>
                        {lang === "my"
                          ? "နံပါတ် စိတ်ကြိုက်ပြင်ရန်"
                          : "Override Number"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Doctor Management Mini-Toolbar (Edit, Status/Postpone, Copy Direct Link, Walk-In, Remove) */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => openStatusModal(doctor)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-amber-600 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-100"
                  >
                    <CalendarClock className="h-4 w-4" />
                    <span>
                      {lang === "my"
                        ? "အချိန်ရွှေ့ / နောက်ကျ သတ်မှတ်ရန်"
                        : "Delay / Postpone"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWalkInModalDoctor(doctor);
                      setWalkInName("");
                      setWalkInPhone("09");
                      setWalkInPriority(false);
                      setCreatedTicketId(null);
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-indigo-700 bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-950 hover:bg-indigo-100"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>
                      {lang === "my"
                        ? "+ ပြင်ပလူနာ / VIP ထည့်ရန်"
                        : "+ Walk-In / VIP"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyDirectBookingLink(doctor)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-blue-700 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-950 hover:bg-blue-100"
                  >
                    {copiedLinkDoctorId === doctor.id ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-700" />
                        <span>{lang === "my" ? "ကူးယူပြီး" : "Copied!"}</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        <span>
                          {lang === "my" ? "Booking လင့်ခ်ကူးရန်" : "Copy Link"}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditDoctorModal(doctor)}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-100"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>{lang === "my" ? "ပြင်မည်" : "Edit"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveDoctor(doctor)}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-800 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === "my" ? "ဖျက်မည်" : "Remove"}</span>
                  </button>
                </div>
              </div>

              {/* Active Patients Queue List for This Doctor */}
              <div className="flex-1 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    {lang === "my"
                      ? `စောင့်ဆိုင်းနေသော လူနာများ (${doctorQueue.length})`
                      : `Patients in Queue (${doctorQueue.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastDoctorId(doctor.id);
                      setIsBroadcastModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-black text-clinic-primary hover:underline"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {lang === "my"
                        ? "ဤဆရာဝန်၏ လူနာများထံ Message ပို့ရန်"
                        : "Message Doctor's Queue"}
                    </span>
                  </button>
                </div>

                {doctorQueue.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                    {lang === "my"
                      ? "လက်ရှိ စောင့်ဆိုင်းနေသော လူနာ မရှိသေးပါ။"
                      : "No active bookings waiting."}
                  </p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {doctorQueue.map((booking) => {
                      const pat = patients.find(
                        (p) => p.id === booking.patient_id
                      );
                      const isServing =
                        booking.queue_number === doctor.current_queue_number;
                      return (
                        <div
                          key={booking.id}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 text-sm ${
                            isServing
                              ? "border-emerald-700 bg-emerald-50 font-black text-emerald-950"
                              : "border-slate-200 bg-slate-50 font-bold text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black">
                              #{booking.queue_number}
                            </span>
                            <span>{pat?.name || "Patient"}</span>
                            {booking.is_priority && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-950">
                                <Crown className="h-3 w-3" /> VIP
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/ticket/${booking.id}`}
                              title="Open QR Ticket"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-800 hover:bg-slate-100"
                            >
                              <QrCode className="h-3.5 w-3.5 text-clinic-primary" />
                              <span>QR</span>
                            </Link>
                            <span
                              className={`rounded-lg px-2 py-1 text-xs font-black uppercase ${
                                booking.payment_status === "paid"
                                  ? "bg-emerald-700 text-white"
                                  : "bg-amber-400 text-slate-950"
                              }`}
                            >
                              {booking.payment_status === "paid"
                                ? lang === "my"
                                  ? "ပေးပြီး"
                                  : "PAID"
                                : lang === "my"
                                ? "စစ်ဆေးရန်"
                                : "PENDING"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Call Next Patient Primary Button */}
              <div className="border-t-2 border-slate-100 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() =>
                    handleAdvanceQueue(
                      doctor.id,
                      (lang === "my" ? doctor.name_my : doctor.name) || doctor.name
                    )
                  }
                  className="flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-5 py-3.5 text-lg font-black text-white shadow-md transition-all hover:opacity-95 active:scale-[0.99]"
                >
                  <Users className="h-6 w-6" />
                  <span>
                    {lang === "my"
                      ? `နောက်လူနာ ခေါ်မည် (#${
                          doctor.current_queue_number + 1
                        })`
                      : `Call Next Patient (#${
                          doctor.current_queue_number + 1
                        })`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          SECTION 2: FINANCIAL CONTROL & RECEIPT VERIFICATION + SMART CREDIT
      ===================================================================== */}
      <div className="mt-10 rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-md sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              {lang === "my"
                ? "၂။ KPay / WavePay / AYA Pay ပြေစာစစ်ဆေးခြင်းနှင့် Credit Points ပြန်အမ်းစနစ်"
                : "2. Payment Verification & Smart Credit Refund Engine"}
            </h2>
            <p className="text-base font-medium text-slate-700">
              {lang === "my"
                ? "လူနာတင်ထားသော ငွေလွှဲပြေစာများကို စစ်ဆေးအတည်ပြုပါ။ ရက်ချိန်းပယ်ဖျက်ပါက ပေးသွင်းငွေကို Credit Points အဖြစ် အလိုအလျောက် ပြောင်းပေးပါမည်။"
                : "Verify uploaded transfer screenshots or cancel bookings to automatically credit 100% of the fee as Credit Points."}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {activeBookings.map((booking) => {
            const patient = patients.find((p) => p.id === booking.patient_id);
            const doctor = doctors.find((d) => d.id === booking.doctor_id);
            const tx = transactions.find(
              (t) => t.booking_id === booking.id && t.type === "payment"
            );

            return (
              <div
                key={booking.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 lg:flex-row lg:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-slate-900 px-3 py-1 text-sm font-black text-white">
                      Queue #{booking.queue_number}
                    </span>
                    <span className="text-lg font-black text-slate-950">
                      {patient?.name} ({patient?.phone})
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-black uppercase ${
                        booking.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-950"
                          : "bg-amber-200 text-amber-950"
                      }`}
                    >
                      {booking.payment_status === "paid" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                          {lang === "my" ? "အတည်ပြုပြီး" : "PAID"}
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-amber-800" />
                          {lang === "my"
                            ? "ပြေစာစစ်ဆေးရန် လိုအပ်သည်"
                            : "NEEDS VERIFICATION"}
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-700">
                    {lang === "my" ? doctor?.name_my : doctor?.name} (
                    {lang === "my"
                      ? `အခန်း ${doctor?.room_number}`
                      : `Room ${doctor?.room_number}`}
                    ) •{" "}
                    {formatCurrency(
                      tx?.amount || doctor?.consultation_fee || 15000,
                      lang
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-clinic-primary" />
                      Method: {tx?.payment_method?.toUpperCase() || "CASH"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-800">
                      <Wallet className="h-4 w-4" />
                      {lang === "my" ? "လူနာ၏ လက်ကျန်ပွိုင့် - " : "Patient Credit: "}
                      {formatCurrency(patient?.credit_points || 0, lang)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {tx?.receipt_image_url && (
                    <button
                      type="button"
                      onClick={() => setInspectReceiptUrl(tx.receipt_image_url)}
                      className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4 text-clinic-primary" />
                      <span>
                        {lang === "my" ? "ပြေစာပုံ ကြည့်မည်" : "View Receipt"}
                      </span>
                    </button>
                  )}

                  <Link
                    href={`/ticket/${booking.id}`}
                    className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-blue-700 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-950 hover:bg-blue-100"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>
                      {lang === "my" ? "QR လက်မှတ်" : "QR Ticket"}
                    </span>
                  </Link>

                  {booking.payment_status === "pending" && (
                    <button
                      type="button"
                      onClick={() => {
                        verifyReceiptAndConfirmBooking(booking.id);
                        setLastAnnouncement(
                          `${patient?.name} ၏ ငွေလွှဲပြေစာကို အတည်ပြုပြီးပါပြီ။`
                        );
                      }}
                      className="flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {lang === "my"
                          ? "ပြေစာ အတည်ပြုမည်"
                          : "Confirm Payment"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCancelAndRefund(booking.id)}
                    className="flex min-h-[48px] items-center gap-2 rounded-xl border-2 border-red-700 bg-red-50 px-4 py-2.5 text-sm font-black text-red-900 hover:bg-red-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>
                      {lang === "my"
                        ? "ပယ်ဖျက်ပြီး Credit ပြောင်းပေးမည်"
                        : "Cancel & Credit Refund"}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: ADD / EDIT DOCTOR MODAL
      ===================================================================== */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950">
                {editingDoctor
                  ? lang === "my"
                    ? "ဆရာဝန် အချက်အလက် ပြင်ဆင်ရန်"
                    : "Edit Doctor Details"
                  : lang === "my"
                  ? "ဆရာဝန်အသစ် ထည့်သွင်းရန်"
                  : "Add New Doctor"}
              </h3>
              <button
                type="button"
                onClick={() => setIsDoctorModalOpen(false)}
                className="rounded-xl p-1 text-slate-500 hover:bg-slate-100"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctorForm} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  ဆရာဝန်အမည် (မြန်မာဘာသာဖြင့်) *
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.name_my}
                  onChange={(e) =>
                    setDoctorForm({ ...doctorForm, name_my: e.target.value })
                  }
                  placeholder="ဥပမာ - ဒေါက်တာ အောင်ကျော်မိုး"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  Doctor Name (English)
                </label>
                <input
                  type="text"
                  value={doctorForm.name}
                  onChange={(e) =>
                    setDoctorForm({ ...doctorForm, name: e.target.value })
                  }
                  placeholder="e.g., Dr. Aung Kyaw Moe"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  အထူးကု ဘာသာရပ် (မြန်မာဘာသာဖြင့်) *
                </label>
                <input
                  type="text"
                  required
                  value={doctorForm.specialty_my}
                  onChange={(e) =>
                    setDoctorForm({
                      ...doctorForm,
                      specialty_my: e.target.value,
                    })
                  }
                  placeholder="ဥပမာ - နှလုံးနှင့် သွေးတိုး အထူးကုဆရာဝန်ကြီး"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  Specialty (English)
                </label>
                <input
                  type="text"
                  value={doctorForm.specialty}
                  onChange={(e) =>
                    setDoctorForm({ ...doctorForm, specialty: e.target.value })
                  }
                  placeholder="e.g., Senior Cardiologist"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    အခန်းအမှတ် (Room)
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorForm.room_number}
                    onChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        room_number: e.target.value,
                      })
                    }
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    စမ်းသပ်ခ (MMK)
                  </label>
                  <input
                    type="number"
                    required
                    step={500}
                    value={doctorForm.consultation_fee}
                    onChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        consultation_fee: Number(e.target.value),
                      })
                    }
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    စတင်ချိန် (Start Time)
                  </label>
                  <input
                    type="text"
                    value={doctorForm.start_time}
                    onChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        start_time: e.target.value,
                      })
                    }
                    placeholder="09:00"
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    ပြီးဆုံးချိန် (End Time)
                  </label>
                  <input
                    type="text"
                    value={doctorForm.end_time}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, end_time: e.target.value })
                    }
                    placeholder="12:00"
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDoctorModalOpen(false)}
                  className="min-h-[52px] flex-1 rounded-xl border-2 border-slate-300 font-black text-slate-800"
                >
                  ပိတ်မည်
                </button>
                <button
                  type="submit"
                  className="min-h-[52px] flex-1 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 font-black text-white shadow-md"
                >
                  သိမ်းဆည်းမည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: DOCTOR STATUS / POSTPONE / DELAY MODAL
      ===================================================================== */}
      {statusModalDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-950">
              {statusModalDoctor.name_my} • အချိန်ရွှေ့ / အခြေအနေပြင်ရန်
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-600">
              ပြောင်းလဲလိုက်သည်နှင့် ဤဆရာဝန်၏ လူနာများထံ အလိုအလျောက် Message ပေးပို့ပါမည်။
            </p>

            <form onSubmit={handleSaveDoctorStatus} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "available", label: "ထိုင်နေသည်" },
                    { id: "delayed", label: "နောက်ကျမည်" },
                    { id: "postponed", label: "ရက်ရွှေ့ဆိုင်း" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusChoice(opt.id)}
                    className={`min-h-[48px] rounded-xl border-2 text-sm font-black ${
                      statusChoice === opt.id
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 bg-white text-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {statusChoice === "delayed" && (
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    နောက်ကျမည့် မိနစ် (Delay Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={delayMinutesInput}
                    onChange={(e) =>
                      setDelayMinutesInput(Number(e.target.value))
                    }
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 text-lg font-black"
                  />
                </div>
              )}

              {statusChoice === "postponed" && (
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    ပြန်လည်ချိန်းဆိုမည့် ရက်စွဲ / အချိန်
                  </label>
                  <input
                    type="text"
                    value={postponedToInput}
                    onChange={(e) => setPostponedToInput(e.target.value)}
                    placeholder="ဥပမာ - မနက်ဖြန် နံနက် ၉ နာရီ (သို့) 2026-10-27"
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  လူနာများထံ ပို့မည့် မှတ်ချက် (Optional Note)
                </label>
                <input
                  type="text"
                  value={statusNoteInput}
                  onChange={(e) => setStatusNoteInput(e.target.value)}
                  placeholder="ဥပမာ - အရေးပေါ်ခွဲစိတ်မှု ရှိပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါရန်"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalDoctor(null)}
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 font-black"
                >
                  ပိတ်မည်
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 font-black text-white"
                >
                  အတည်ပြုပြီး Message ပို့မည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: CUSTOM QUEUE NUMBER OVERRIDE MODAL
      ===================================================================== */}
      {overrideModalDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-950">
              လက်ရှိ အလှည့်နံပါတ် ပြင်ဆင်ရန်
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-600">
              {overrideModalDoctor.name_my} အတွက် လက်ရှိ ခေါ်ဆိုနေသော နံပါတ်ကို စိတ်ကြိုက် သတ်မှတ်နိုင်ပါသည်။
            </p>
            <form onSubmit={handleSaveQueueOverride} className="mt-4 space-y-4">
              <input
                type="number"
                min={0}
                value={overrideQueueValue}
                onChange={(e) => setOverrideQueueValue(Number(e.target.value))}
                className="min-h-[60px] w-full rounded-2xl border-2 border-slate-900 bg-slate-50 text-center text-3xl font-black"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOverrideModalDoctor(null)}
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 font-black"
                >
                  ပိတ်မည်
                </button>
                <button
                  type="submit"
                  className="min-h-[48px] flex-1 rounded-xl bg-blue-700 font-black text-white"
                >
                  သတ်မှတ်မည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: WALK-IN / VIP PATIENT INSERTION & QR GENERATOR MODAL
      ===================================================================== */}
      {walkInModalDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-950">
              ပြင်ပလူနာ (Walk-In) / VIP ထည့်သွင်းရန်
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-600">
              {walkInModalDoctor.name_my} အတွက် ကောင်တာမှ တိုက်ရိုက် အလှည့်နံပါတ်နှင့် QR လက်မှတ် ထုတ်ပေးနိုင်ပါသည်။
            </p>

            {createdTicketId ? (
              <div className="mt-5 space-y-4 rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
                <h4 className="text-lg font-black text-emerald-950">
                  စာရင်းသွင်းပြီး QR လက်မှတ် ထုတ်ပြီးပါပြီ!
                </h4>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/ticket/${createdTicketId}`}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>QR လက်မှတ် ဖွင့်ကြည့်ရန် / ပေးပို့ရန်</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setWalkInModalDoctor(null)}
                    className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm font-black"
                  >
                    ပိတ်မည်
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateWalkIn} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    လူနာအမည် *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="ဥပမာ - ဦးကျော်မြင့်"
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-extrabold text-slate-900">
                    ဖုန်းနံပါတ်
                  </label>
                  <input
                    type="text"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
                  <input
                    type="checkbox"
                    checked={walkInPriority}
                    onChange={(e) => setWalkInPriority(e.target.checked)}
                    className="h-5 w-5"
                  />
                  <span className="text-sm font-black text-amber-950">
                    VIP / အရေးပေါ် ဦးစားပေးလူနာ (လက်ရှိနံပါတ်နောက်သို့ တိုက်ရိုက်ထည့်မည်)
                  </span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWalkInModalDoctor(null)}
                    className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 font-black"
                  >
                    ပိတ်မည်
                  </button>
                  <button
                    type="submit"
                    className="min-h-[48px] flex-1 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 font-black text-white"
                  >
                    နံပါတ်နှင့် QR ထုတ်မည်
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: BROADCAST MESSAGE ENGINE (MANUAL & QUICK TEMPLATES)
      ===================================================================== */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950">
                လူနာများထံ သက်ဆိုင်ရာ ဆရာဝန်အလိုက် Message ပေးပို့ရန်
              </h3>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="rounded-xl p-1 text-slate-500 hover:bg-slate-100"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={handleSendManualBroadcast}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  မည်သည့် ဆရာဝန်၏ လူနာများထံ ပို့မည်နည်း?
                </label>
                <select
                  value={broadcastDoctorId}
                  onChange={(e) => setBroadcastDoctorId(e.target.value)}
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 bg-white px-3.5 font-bold"
                >
                  <option value="all">
                    ဆရာဝန်အားလုံး၏ လူနာများထံ (All Patients)
                  </option>
                  {activeDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_my} ({d.name}) - အခန်း {d.room_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Templates */}
              <div>
                <span className="mb-1.5 block text-xs font-extrabold uppercase text-slate-600">
                  အသင့်သုံး စာသားများ (နှိပ်၍ ရွေးချယ်နိုင်သည်) -
                </span>
                <div className="flex flex-wrap gap-2">
                  {MANUAL_TEMPLATES.map((tpl) => {
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => {
                          setBroadcastTitleMy(tpl.title_my);
                          setBroadcastBodyMy(tpl.body_my);
                          setBroadcastTitleEn(tpl.title_en);
                          setBroadcastBodyEn(tpl.body_en);
                        }}
                        className="rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-950 hover:bg-blue-100"
                      >
                        {tpl.title_my}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  ခေါင်းစဉ် (မြန်မာ)
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitleMy}
                  onChange={(e) => setBroadcastTitleMy(e.target.value)}
                  placeholder="ဥပမာ - ဆရာဝန်ကြီး ရောက်ရှိပါပြီ"
                  className="min-h-[48px] w-full rounded-xl border-2 border-slate-300 px-3.5 font-bold"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-extrabold text-slate-900">
                  အကြောင်းအရာ စာသား (မြန်မာ) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={broadcastBodyMy}
                  onChange={(e) => setBroadcastBodyMy(e.target.value)}
                  placeholder="လူနာများ၏ ဖုန်းမျက်နှာပြင်ပေါ်တွင် ပေါ်လာမည့် စာသားကို ရိုက်ထည့်ပါ..."
                  className="w-full rounded-xl border-2 border-slate-300 p-3.5 font-bold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 font-black"
                >
                  ပိတ်မည်
                </button>
                <button
                  type="submit"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 font-black text-white shadow-md"
                >
                  <Send className="h-4 w-4" />
                  <span>Message ပေးပို့မည်</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: RECEIPT SCREENSHOT INSPECTION MODAL
      ===================================================================== */}
      {inspectReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-w-md rounded-3xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950">
                {lang === "my"
                  ? "ငွေလွှဲပြေစာ စစ်ဆေးရန်"
                  : "Payment Receipt Verification"}
              </h3>
              <button
                type="button"
                onClick={() => setInspectReceiptUrl(null)}
                className="rounded-xl border-2 border-slate-300 px-3 py-1 text-sm font-black text-slate-900"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <img
              src={inspectReceiptUrl}
              alt="Payment Transfer Slip"
              className="mx-auto max-h-[65vh] rounded-2xl border border-slate-200 object-contain"
            />
            <button
              type="button"
              onClick={() => setInspectReceiptUrl(null)}
              className="mt-4 min-h-[52px] w-full rounded-2xl bg-slate-900 text-base font-black text-white"
            >
              {lang === "my" ? "ပိတ်မည်" : "Close Preview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
