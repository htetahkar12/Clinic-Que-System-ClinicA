"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { useClinic } from "@/lib/clinic-store";
import {
  QrCode,
  Building2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Bell,
} from "lucide-react";

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;
  const { lang, settings, bookings, doctors, patients } = useClinic();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const booking = bookings.find((b) => b.id === bookingId);
  const doctor = doctors.find((d) => d.id === booking?.doctor_id);
  const patient = patients.find((p) => p.id === booking?.patient_id);

  useEffect(() => {
    if (!booking) return;
    if (booking.qr_image_url) {
      setQrUrl(booking.qr_image_url);
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const ticketCode = booking.ticket_code || `Q-${booking.queue_number}`;
    const pidQuery = patient?.patient_code
      ? `&pid=${encodeURIComponent(patient.patient_code)}`
      : "";
    const url = `${origin}/ticket/${booking.id}?code=${ticketCode}${pidQuery}`;
    QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [booking, patient]);

  const handleCopyTicketLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!booking || !doctor) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-8 shadow-lg">
          <QrCode className="mx-auto h-14 w-14 text-slate-400" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            {lang === "my"
              ? "အလှည့်လက်မှတ် ရှာမတွေ့ပါ"
              : "Queue Ticket Not Found"}
          </h1>
          <p className="mt-2 text-base font-bold text-slate-600">
            {lang === "my"
              ? "ဤလက်မှတ်နံပါတ်သည် သက်တမ်းကုန်ဆုံးသွားခြင်း သို့မဟုတ် ပယ်ဖျက်ထားခြင်း ဖြစ်နိုင်ပါသည်။"
              : "This ticket link may have expired or been canceled."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-3 text-base font-black text-white shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>
              {lang === "my"
                ? "ပင်မစာမျက်နှာသို့ ပြန်သွားမည်"
                : "Go to Patient Portal"}
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const currentServing = doctor.current_queue_number;
  const myQueue = booking.queue_number;
  const patientsAhead = Math.max(0, myQueue - currentServing);
  const isMyTurn = myQueue === currentServing;
  const ticketCode = booking.ticket_code || `Q-${booking.queue_number}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>
            {lang === "my" ? "လူနာစာမျက်နှာသို့" : "Back to Portal"}
          </span>
        </Link>

        <button
          type="button"
          onClick={handleCopyTicketLink}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-blue-700 bg-blue-50 px-4 py-2 text-sm font-black text-blue-950 hover:bg-blue-100"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-700" />
              <span>{lang === "my" ? "လင့်ခ်ကူးပြီး" : "Link Copied!"}</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>
                {lang === "my" ? "လက်မှတ်လင့်ခ် မျှဝေရန်" : "Share Ticket Link"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Digital Boarding-Pass Style Queue Ticket */}
      <div className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-2xl">
        {/* Top Royal Gradient Header */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-6 text-center text-white">
          <p className="text-xs font-extrabold uppercase tracking-widest text-sky-300">
            {lang === "my" ? settings.clinicNameMy : settings.clinicName}
          </p>
          <h1 className="mt-1 text-2xl font-black">
            {lang === "my"
              ? "ဒစ်ဂျစ်တယ် အလှည့်နံပါတ် လက်မှတ်"
              : "Official Queue Pass"}
          </h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm font-black text-emerald-300">
            <span>Ticket Code: {ticketCode}</span>
          </div>
        </div>

        {/* Live Numbers Section */}
        <div className="grid grid-cols-2 border-b-2 border-dashed border-slate-300 bg-slate-50">
          <div className="border-r-2 border-slate-200 p-5 text-center">
            <span className="block text-xs font-extrabold uppercase text-slate-600">
              {lang === "my" ? "ယခု ပြသနေသောနံပါတ်" : "Now Serving"}
            </span>
            <span className="mt-1 block text-5xl font-black text-slate-900">
              #{currentServing}
            </span>
          </div>
          <div
            className={`p-5 text-center ${
              isMyTurn ? "bg-emerald-600 text-white" : "bg-blue-700 text-white"
            }`}
          >
            <span className="block text-xs font-extrabold uppercase text-white/90">
              {lang === "my" ? "သင့်အလှည့် နံပါတ်" : "Your Queue No."}
            </span>
            <span className="mt-1 block text-5xl font-black">#{myQueue}</span>
          </div>
        </div>

        {/* Status Banner */}
        <div className="border-b-2 border-slate-100 bg-emerald-50/70 px-6 py-3.5 text-center">
          <p className="flex items-center justify-center gap-2 text-base font-black text-emerald-950">
            <Bell className="h-5 w-5 text-emerald-700" />
            {isMyTurn
              ? lang === "my"
                ? `သင့်အလှည့် ရောက်ပါပြီ! အခန်း (${doctor.room_number}) သို့ ဝင်ပါ`
                : `It's your turn! Please enter Room ${doctor.room_number}`
              : lang === "my"
              ? `သင့်ရှေ့တွင် လူနာ (${patientsAhead}) ဦး ကျန်ပါသည်`
              : `${patientsAhead} patient(s) ahead of you`}
          </p>
        </div>

        {/* QR Code & Details */}
        <div className="p-6 text-center">
          <div className="mx-auto inline-flex flex-col items-center rounded-3xl border-2 border-slate-200 bg-slate-50 p-4 shadow-inner">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`QR Code ${ticketCode}`}
                className="h-52 w-52 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center">
                <QrCode className="h-16 w-16 text-slate-400" />
              </div>
            )}
            <span className="mt-2 font-mono text-base font-black text-slate-900">
              {ticketCode}
            </span>
            {patient?.patient_code && (
              <span className="mt-1 rounded-lg bg-indigo-950 px-3 py-0.5 font-mono text-xs font-black text-amber-300">
                ID: {patient.patient_code}
              </span>
            )}
          </div>

          <div className="mt-6 space-y-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-left">
            {patient?.patient_code && (
              <div className="flex justify-between">
                <span className="text-sm font-bold text-slate-600">
                  {lang === "my" ? "လူနာ ID နံပါတ်" : "Patient ID"}
                </span>
                <span className="font-mono text-base font-black text-indigo-900">
                  {patient.patient_code}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-bold text-slate-600">
                {lang === "my" ? "လူနာအမည်" : "Patient"}
              </span>
              <span className="text-base font-black text-slate-950">
                {patient?.name || "Walk-in Patient"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-bold text-slate-600">
                {lang === "my" ? "အထူးကု ဆရာဝန်" : "Doctor"}
              </span>
              <span className="text-base font-black text-slate-950">
                {lang === "my" ? doctor.name_my : doctor.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-bold text-slate-600">
                {lang === "my" ? "အခန်းအမှတ်" : "Consultation Room"}
              </span>
              <span className="inline-flex items-center gap-1 font-black text-blue-900">
                <Building2 className="h-4 w-4" />
                {lang === "my"
                  ? `အခန်း (${doctor.room_number})`
                  : `Room ${doctor.room_number}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-bold text-slate-600">
                {lang === "my" ? "ငွေပေးချေမှု" : "Payment Status"}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-800">
                {booking.payment_status === "paid" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {lang === "my" ? "ပေးချေပြီး" : "Paid"}
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-amber-700" />
                    {lang === "my" ? "စစ်ဆေးနေဆဲ" : "Pending Verification"}
                  </>
                )}
              </span>
            </div>
          </div>

          {qrUrl && (
            <a
              href={qrUrl}
              download={`Queue-Pass-${ticketCode}.png`}
              className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-3.5 text-lg font-black text-white shadow-md hover:opacity-95"
            >
              <Download className="h-5 w-5" />
              <span>
                {lang === "my"
                  ? "QR လက်မှတ်ပုံ ဒေါင်းလုဒ်ဆွဲမည်"
                  : "Download QR Pass Image"}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
