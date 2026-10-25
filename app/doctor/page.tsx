"use client";

import React, { useState } from "react";
import { useClinic } from "@/lib/clinic-store";
import {
  Stethoscope,
  ArrowRight,
  UserCheck,
  Building2,
  Lock,
} from "lucide-react";

const STAFF_AUTH_STORAGE_KEY = "auracare_staff_authenticated_v2";

export default function DoctorPortalPage() {
  const {
    lang,
    settings,
    doctors,
    bookings,
    patients,
    advanceDoctorQueue,
    markDoctorArrivedAndStartQueue,
    updateDoctorSessionStatus,
  } = useClinic();
  const activeDoctors = doctors.filter((d) => !d.is_archived);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    activeDoctors[0]?.id || ""
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isStaffAuthed, setIsStaffAuthed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STAFF_AUTH_STORAGE_KEY) === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === settings.receptionPin) {
      sessionStorage.setItem(STAFF_AUTH_STORAGE_KEY, "true");
      setIsStaffAuthed(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError(
        lang === "my"
          ? "စကားဝှက် (Password) မှားယွင်းနေပါသည်။"
          : "Invalid Staff Password. Please try again."
      );
    }
  };

  if (!isStaffAuthed) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 p-6 text-white">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-sky-300">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black">
              {lang === "my"
                ? "ဆရာဝန်အခန်း ဝင်ရောက်ရန်"
                : "Doctor Consultation Portal"}
            </h1>
            <p className="mt-1 text-sm font-bold text-blue-100">
              {lang === "my"
                ? "ဆရာဝန်အခန်း စနစ်သို့ ဝင်ရောက်ရန် စကားဝှက် (Password) ရိုက်ထည့်ပါ။"
                : "Enter Staff Password to open the Doctor Room display."}
            </p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-sm font-extrabold text-slate-900">
                {lang === "my"
                  ? "ဝန်ထမ်း စကားဝှက် (Password)"
                  : "Staff Security Password"}
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
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
              {lang === "my" ? "ဆရာဝန်အခန်း ဖွင့်မည်" : "Unlock Doctor Display"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const doctor =
    activeDoctors.find((d) => d.id === selectedDoctorId) || activeDoctors[0];
  if (!doctor) return null;

  const isNotArrived =
    doctor.status === "not_arrived" || doctor.current_queue_number === 0;

  const currentBooking = bookings.find(
    (b) =>
      b.doctor_id === doctor.id &&
      b.queue_number === doctor.current_queue_number &&
      b.status !== "cancelled"
  );
  const currentPatient = patients.find(
    (p) => p.id === currentBooking?.patient_id
  );

  const upcomingBookings = bookings
    .filter(
      (b) =>
        b.doctor_id === doctor.id &&
        b.status === "waiting" &&
        b.queue_number > doctor.current_queue_number
    )
    .sort((a, b) => a.queue_number - b.queue_number);

  const waitingCount = upcomingBookings.length;

  const handleMarkArrived = async () => {
    const res = await markDoctorArrivedAndStartQueue(doctor.id);
    setFeedback(
      lang === "my"
        ? `ဆရာဝန်ရောက်ရှိကြောင်း သတ်မှတ်ပြီး အလှည့်နံပါတ် #${res.newQueueNumber} စတင်ခေါ်ဆိုပြီးပါပြီ။`
        : `Doctor marked arrived and started Queue #${res.newQueueNumber}.`
    );
  };

  const handleCallNext = async () => {
    const res = await advanceDoctorQueue(doctor.id);
    setFeedback(
      lang === "my"
        ? `လူနာအလှည့် #${res.newQueueNumber} ကို ခေါ်ဆိုပြီးပါပြီ (Reception နှင့် လူနာဖုန်းများသို့ တိုက်ရိုက် ချိတ်ဆက်ပြီး)`
        : `Called Queue #${res.newQueueNumber}. Synced live with Reception & Patient phones.`
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-6 sm:py-10">
      {/* Room Selector */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-6 w-6 text-clinic-primary" />
          <span className="text-sm font-black text-slate-950 sm:text-base">
            {lang === "my" ? "ဆရာဝန်အခန်း ရွေးရန်" : "Select Consultation Room"}
          </span>
        </div>
        <select
          value={doctor.id}
          onChange={(e) => {
            setSelectedDoctorId(e.target.value);
            setFeedback(null);
          }}
          className="min-h-[46px] rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-extrabold text-slate-950 focus:border-clinic-primary focus:outline-none sm:text-base"
        >
          {activeDoctors.map((d) => (
            <option key={d.id} value={d.id}>
              {lang === "my"
                ? `အခန်း ${d.room_number} — ${d.name_my} (${d.doctor_code})`
                : `Room ${d.room_number} — ${d.name} (${d.doctor_code})`}
            </option>
          ))}
        </select>
      </div>

      {/* Ultra-Minimalist High-Contrast Consultation Card */}
      <div className="overflow-hidden rounded-3xl border-2 border-slate-300 bg-white text-center shadow-2xl">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white sm:p-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1 text-xs font-black uppercase tracking-wider text-sky-300">
            <Building2 className="h-3.5 w-3.5" />
            <span>
              {lang === "my"
                ? `အခန်း ${doctor.room_number} • ${doctor.name_my}`
                : `Room ${doctor.room_number} • ${doctor.name}`}
            </span>
          </div>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-widest text-slate-300 sm:text-sm">
            {lang === "my"
              ? "လက်ရှိ ကြည့်ရှုနေသော အလှည့်နံပါတ်"
              : "Current Queue Number"}
          </p>
        </div>

        <div className="p-6 sm:p-10">
          {isNotArrived ? (
            <div className="my-4 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
              <p className="text-xl font-black sm:text-2xl">
                {lang === "my"
                  ? "ဆရာဝန် မရောက်သေးပါ (စောင့်ဆိုင်းဆဲ)"
                  : "Doctor Not Arrived Yet"}
              </p>
              <p className="mt-1 text-xs font-bold text-amber-900 sm:text-sm">
                {lang === "my"
                  ? "ဆရာဝန် ရောက်ရှိလာပါက အောက်ပါခလုတ်ကို နှိပ်၍ အလှည့်နံပါတ် #1 စတင်ခေါ်ဆိုနိုင်ပါသည်။"
                  : "Tap below when the doctor arrives to start calling #1."}
              </p>
              <button
                type="button"
                onClick={handleMarkArrived}
                className="mt-4 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-lg font-black text-white shadow-xl hover:opacity-95 sm:text-xl"
              >
                <span>
                  {lang === "my"
                    ? "ဆရာဝန်ရောက်ပြီ — #1 စတင်ခေါ်ဆိုမည်"
                    : "Doctor Arrived — Start #1"}
                </span>
                <ArrowRight className="h-6 w-6 shrink-0" />
              </button>
            </div>
          ) : (
            <>
              <div className="queue-number-fluid my-2 font-black tracking-tighter text-slate-950">
                #{doctor.current_queue_number}
              </div>

              <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-emerald-700 bg-emerald-50 px-4 py-2 text-base font-black text-emerald-950 sm:text-lg">
                <UserCheck className="h-5 w-5 text-emerald-700" />
                <span>
                  {currentPatient
                    ? currentPatient.name
                    : lang === "my"
                    ? "ကောင်တာမှ လူနာ (Walk-in)"
                    : "Walk-in / Desk Patient"}
                </span>
                {currentPatient?.patient_code && (
                  <span className="rounded-lg bg-indigo-950 px-2.5 py-0.5 font-mono text-xs font-black text-amber-300">
                    ID: {currentPatient.patient_code}
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm font-extrabold text-slate-700 sm:text-base">
                {lang === "my"
                  ? `အခန်းပြင်ပတွင် စောင့်ဆိုင်းနေသူ (${waitingCount}) ဦး ကျန်ရှိပါသည်`
                  : `${waitingCount} patient(s) waiting outside`}
              </p>

              {/* Single Full-Width Primary Action Button */}
              <button
                type="button"
                onClick={handleCallNext}
                className="mt-6 flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-xl font-black text-white shadow-xl transition-all hover:opacity-95 active:scale-[0.99] sm:min-h-[76px] sm:text-2xl"
              >
                <span>
                  {lang === "my"
                    ? `နောက်လူနာ ခေါ်မည် (#${doctor.current_queue_number + 1})`
                    : `Call Next Patient (#${doctor.current_queue_number + 1})`}
                </span>
                <ArrowRight className="h-7 w-7 shrink-0" />
              </button>
            </>
          )}

          {/* Quick Session Status Controls */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateDoctorSessionStatus(doctor.id, {
                  status: "available",
                  delayMinutes: 0,
                })
              }
              className={`rounded-xl border-2 px-3 py-2 text-xs font-black ${
                doctor.status === "available"
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-800"
              }`}
            >
              {lang === "my" ? "ထိုင်နေပါပြီ (Available)" : "Available"}
            </button>
            <button
              type="button"
              onClick={() =>
                updateDoctorSessionStatus(doctor.id, {
                  status: "delayed",
                  delayMinutes: 15,
                  note: "ဆရာဝန် ခေတ္တနားနေပါသည် (၁၅ မိနစ်)",
                })
              }
              className={`rounded-xl border-2 px-3 py-2 text-xs font-black ${
                doctor.status === "delayed"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-800"
              }`}
            >
              {lang === "my" ? "ခေတ္တနားမည် (၁၅ မိနစ်)" : "15m Break / Delay"}
            </button>
          </div>

          {feedback && (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-extrabold text-emerald-900">
              {feedback}
            </p>
          )}
        </div>
      </div>

      {/* Upcoming Waiting Queue List */}
      {upcomingBookings.length > 0 && (
        <div className="mt-6 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-md">
          <h2 className="mb-3 text-base font-black text-slate-950">
            {lang === "my"
              ? `စောင့်ဆိုင်းနေသော လူနာစာရင်း (${upcomingBookings.length} ဦး)`
              : `Upcoming Waiting Patients (${upcomingBookings.length})`}
          </h2>
          <div className="space-y-2">
            {upcomingBookings.map((b) => {
              const p = patients.find((pt) => pt.id === b.patient_id);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-blue-900 px-3 py-1 font-mono text-sm font-black text-white">
                      #{b.queue_number}
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {p?.name || "Walk-in Patient"}
                      </p>
                      {p?.patient_code && (
                        <p className="font-mono text-xs font-bold text-indigo-800">
                          ID: {p.patient_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                      b.payment_status === "paid"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {b.payment_status === "paid"
                      ? lang === "my"
                        ? "အတည်ပြုပြီး"
                        : "Confirmed"
                      : lang === "my"
                      ? "စစ်ဆေးဆဲ"
                      : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
