"use client";

import React, { useState } from "react";
import { useClinic } from "@/lib/clinic-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightCircle, Stethoscope, BellRing, Lock } from "lucide-react";

export default function DoctorMinimalistPortalPage() {
  const { doctors, advanceDoctorQueue } = useClinic();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors[0]?.id || "11111111-1111-4111-8111-111111111101"
  );
  const [isCalling, setIsCalling] = useState(false);
  const [lastNotified, setLastNotified] = useState<string | null>(null);

  // Doctor/Staff PIN Gate
  const [isDoctorAuthenticated, setIsDoctorAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("clinic_staff_auth") === "true";
    }
    return false;
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handleDoctorLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === "1234" || pinInput === "8888") {
      setIsDoctorAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("clinic_staff_auth", "true");
      }
      setPinError("");
    } else {
      setPinError("Invalid Passcode. Default: 1234");
    }
  };

  const activeDoctor =
    doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  if (!isDoctorAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="border-2 border-slate-900 shadow-2xl">
          <CardHeader className="space-y-2 border-b-2 border-slate-200 bg-slate-900 text-white rounded-t-xl p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-clinic-primary text-white shadow-md">
              <Lock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black text-white">
              Doctor Consultation Portal
            </CardTitle>
            <p className="text-sm font-semibold text-slate-300">
              For Consulting Physicians only.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleDoctorLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase text-slate-700 mb-1">
                  Doctor Passcode
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter Passcode (Default: 1234)"
                  className="w-full text-center tracking-[0.4em] text-2xl font-black rounded-xl border-2 border-slate-900 p-3 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-clinic-primary/40"
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-sm font-bold text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-300 text-center">
                  {pinError}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full text-lg">
                Enter Doctor Room
              </Button>

              <div className="text-center pt-2">
                <a
                  href="/"
                  className="text-sm font-bold text-clinic-primary hover:underline"
                >
                  ← Return to Patient Portal
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeDoctor) return null;

  const handleCallNext = async () => {
    setIsCalling(true);
    try {
      const res = await advanceDoctorQueue(activeDoctor.id);
      setLastNotified(
        res.notifiedPatients.length > 0
          ? `Synced with Reception • Alerted ${res.notifiedPatients.join(", ")}`
          : `Synced with Reception • Queue #${res.newQueueNumber}`
      );
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-2xl flex-col justify-between px-4 py-8 sm:px-6">
      {/* Minimalist Room Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-6 w-6 text-clinic-primary" />
          <span className="text-base font-extrabold text-slate-700">
            Consultation Room:
          </span>
        </div>
        <select
          aria-label="Select Doctor Room"
          value={activeDoctor.id}
          onChange={(e) => {
            setSelectedDoctorId(e.target.value);
            setLastNotified(null);
          }}
          className="min-h-[48px] rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-2 text-lg font-black text-slate-950 focus:outline-none focus:ring-4 focus:ring-clinic-primary/30"
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.room_number})
            </option>
          ))}
        </select>
      </div>

      {/* Massive Ultra-Minimalist Current Queue Display */}
      <div className="my-8 flex flex-1 flex-col items-center justify-center rounded-3xl border-4 border-slate-900 bg-white p-10 text-center shadow-xl">
        <p className="text-lg font-black uppercase tracking-widest text-slate-600">
          {activeDoctor.room_number} • Now Serving
        </p>

        <div className="my-6 text-[7rem] sm:text-[9.5rem] font-black leading-none tracking-tighter text-slate-950">
          #{activeDoctor.current_queue_number}
        </div>

        <p className="text-xl font-bold text-slate-800">{activeDoctor.name}</p>

        {lastNotified && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-emerald-700 bg-emerald-50 px-4 py-2 text-base font-extrabold text-emerald-950">
            <BellRing className="h-5 w-5 text-emerald-700" />
            {lastNotified}
          </div>
        )}
      </div>

      {/* Massive Full-Width [Call Next Patient] Button */}
      <Button
        size="xl"
        onClick={handleCallNext}
        disabled={isCalling}
        className="min-h-[88px] w-full rounded-3xl text-2xl sm:text-3xl font-black shadow-xl"
      >
        <ArrowRightCircle className="mr-3 h-9 w-9" />
        {isCalling
          ? "Calling Next Patient..."
          : `Call Next Patient (#${activeDoctor.current_queue_number + 1})`}
      </Button>
    </div>
  );
}
