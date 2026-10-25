"use client";

import React, { useState } from "react";
import { useClinic } from "@/lib/clinic-store";
import { formatCurrency, formatPhoneDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  BellRing,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRightCircle,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  MapPin,
} from "lucide-react";

export default function ReceptionCommandCenterPage() {
  const {
    doctors,
    bookings,
    patients,
    transactions,
    pushLogs,
    advanceDoctorQueue,
    verifyReceiptAndConfirmBooking,
    cancelBookingAndRefund,
  } = useClinic();

  const [selectedReceipt, setSelectedReceipt] = useState<{
    bookingId: string;
    patientName: string;
    doctorName: string;
    queueNumber: number;
    amount: number;
    paymentMethod: string;
    imageUrl: string;
    paymentStatus: string;
  } | null>(null);

  const [actionBanner, setActionBanner] = useState<{
    type: "success" | "refund";
    message: string;
  } | null>(null);

  const [busyDoctorId, setBusyDoctorId] = useState<string | null>(null);

  // Staff Security PIN Gate
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("clinic_staff_auth") === "true";
    }
    return false;
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handleStaffLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === "1234" || pinInput === "8888") {
      setIsStaffAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("clinic_staff_auth", "true");
      }
      setPinError("");
    } else {
      setPinError("Invalid Staff Passcode. Default PIN: 1234");
    }
  };

  const handleNextPatient = async (doctorId: string, doctorName: string) => {
    setBusyDoctorId(doctorId);
    try {
      const res = await advanceDoctorQueue(doctorId);
      const notifiedText =
        res.notifiedPatients.length > 0
          ? `FCM Push sent to next ${res.notifiedPatients.length} patient(s): ${res.notifiedPatients.join(", ")}`
          : "No waiting patients in queue.";
      setActionBanner({
        type: "success",
        message: `${doctorName} advanced to Queue #${res.newQueueNumber}. ${notifiedText}`,
      });
    } finally {
      setBusyDoctorId(null);
    }
  };

  const handleApproveReceipt = async (
    bookingId: string,
    patientName: string
  ) => {
    await verifyReceiptAndConfirmBooking(bookingId);
    setSelectedReceipt(null);
    setActionBanner({
      type: "success",
      message: `Verified KPay/WavePay receipt and confirmed booking for ${patientName}.`,
    });
  };

  const handleCancelAndRefund = async (bookingId: string) => {
    const res = await cancelBookingAndRefund(bookingId);
    setActionBanner({
      type: "refund",
      message: `Booking cancelled. Automatically refunded ${formatCurrency(
        res.refundedAmount
      )} as Credit Points to ${res.patientName}'s wallet.`,
    });
  };

  // Pending KPay / WavePay receipts waiting for reception verification
  const pendingBookings = bookings.filter(
    (b) => b.payment_status === "pending" && b.status !== "cancelled"
  );

  const activeWaitingCount = bookings.filter(
    (b) => b.status === "waiting" || b.status === "in_progress"
  ).length;

  if (!isStaffAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card className="border-2 border-slate-900 shadow-2xl">
          <CardHeader className="space-y-2 border-b-2 border-slate-200 bg-slate-900 text-white rounded-t-xl p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-clinic-primary text-white shadow-md">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-black text-white">
              Reception Desk Access
            </CardTitle>
            <p className="text-sm font-semibold text-slate-300">
              Authorized Clinic Staff Only. Patients please use the Patient Portal.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase text-slate-700 mb-1">
                  Staff Passcode (PIN)
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
                Authenticate Staff Access
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Command Center Header & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border-2 border-slate-900 bg-slate-900 p-6 text-white shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-clinic-primary px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
            Admin & Reception Command Center
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Poly Clinic Live Queue & Payment Operations
          </h1>
          <p className="text-base font-medium text-slate-300">
            Real-time queue dispatch, KPay/WavePay receipt verification, and
            instant credit point refunds.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
            <span className="block text-xs font-bold uppercase text-slate-300">
              Active Rooms
            </span>
            <span className="text-2xl font-black text-white">
              {doctors.filter((d) => d.is_active).length}
            </span>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-center">
            <span className="block text-xs font-bold uppercase text-slate-300">
              Active Queue
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {activeWaitingCount}
            </span>
          </div>
          <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-3 text-center">
            <span className="block text-xs font-bold uppercase text-amber-200">
              Pending Receipts
            </span>
            <span className="text-2xl font-black text-amber-300">
              {pendingBookings.length}
            </span>
          </div>
        </div>
      </div>

      {/* Live Action Feedback Banner */}
      {actionBanner && (
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border-2 p-4 shadow-md ${
            actionBanner.type === "refund"
              ? "border-amber-700 bg-amber-50 text-amber-950"
              : "border-emerald-700 bg-emerald-50 text-emerald-950"
          }`}
        >
          <div className="flex items-center gap-3 font-extrabold text-base sm:text-lg">
            {actionBanner.type === "refund" ? (
              <RefreshCcw className="h-6 w-6 text-amber-800 shrink-0" />
            ) : (
              <BellRing className="h-6 w-6 text-emerald-700 shrink-0" />
            )}
            <span>{actionBanner.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionBanner(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* SECTION 1: LIVE DOCTOR QUEUE GRID & [NEXT PATIENT] FCM DISPATCH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-950 flex items-center gap-2">
            <Users className="h-6 w-6 text-clinic-primary" />
            Live Doctor Rooms & Queue Control
          </h2>
          <span className="text-sm font-bold text-slate-600">
            Clicking [Next Patient] alerts the next 3 waiting patients via FCM
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {doctors.map((doctor) => {
            const doctorQueueBookings = bookings
              .filter(
                (b) =>
                  b.doctor_id === doctor.id &&
                  b.status !== "cancelled" &&
                  b.queue_number >= doctor.current_queue_number
              )
              .sort((a, b) => a.queue_number - b.queue_number);

            return (
              <Card
                key={doctor.id}
                className="border-2 border-slate-300 shadow-sm flex flex-col justify-between"
              >
                <CardHeader className="border-b-2 border-slate-100 bg-slate-50/70 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="secondary" className="mb-1.5">
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        {doctor.room_number}
                      </Badge>
                      <CardTitle className="text-xl font-black text-slate-950">
                        {doctor.name}
                      </CardTitle>
                      <p className="text-sm font-bold text-slate-600">
                        {doctor.specialty}
                      </p>
                    </div>

                    {/* Current Queue Number Display */}
                    <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 px-5 py-3 text-center text-white shrink-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Current Queue
                      </span>
                      <span className="text-4xl font-black text-emerald-400">
                        #{doctor.current_queue_number}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Waiting Patients List for This Doctor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      <span>Waiting & Active Patients</span>
                      <span>{doctorQueueBookings.length} in Queue</span>
                    </div>

                    {doctorQueueBookings.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-600">
                        No patients currently waiting for {doctor.name}.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 rounded-xl border-2 border-slate-200 bg-white">
                        {doctorQueueBookings.map((booking) => {
                          const pat = patients.find(
                            (p) => p.id === booking.patient_id
                          );
                          const tx = transactions.find(
                            (t) => t.booking_id === booking.id
                          );
                          const isServingNow =
                            booking.queue_number ===
                            doctor.current_queue_number;

                          return (
                            <div
                              key={booking.id}
                              className={`flex flex-wrap items-center justify-between gap-2 p-3 ${
                                isServingNow ? "bg-emerald-50/80" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-base ${
                                    isServingNow
                                      ? "bg-emerald-700 text-white"
                                      : "bg-slate-900 text-white"
                                  }`}
                                >
                                  #{booking.queue_number}
                                </span>
                                <div>
                                  <p className="text-base font-extrabold text-slate-950">
                                    {pat?.name || "Patient"}
                                    {isServingNow && (
                                      <span className="ml-2 text-xs font-black uppercase text-emerald-800">
                                        (In Room)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs font-bold text-slate-600">
                                    {pat ? formatPhoneDisplay(pat.phone) : ""} •{" "}
                                    {tx?.payment_method?.toUpperCase() ||
                                      "PAID"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {booking.payment_status === "pending" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-amber-600 bg-amber-50 text-amber-950 hover:bg-amber-100"
                                    onClick={() =>
                                      setSelectedReceipt({
                                        bookingId: booking.id,
                                        patientName: pat?.name || "Patient",
                                        doctorName: doctor.name,
                                        queueNumber: booking.queue_number,
                                        amount:
                                          tx?.amount || doctor.consultation_fee,
                                        paymentMethod:
                                          tx?.payment_method || "kpay",
                                        imageUrl: tx?.receipt_image_url || "",
                                        paymentStatus: booking.payment_status,
                                      })
                                    }
                                  >
                                    <Receipt className="mr-1.5 h-4 w-4" />
                                    Verify Receipt
                                  </Button>
                                ) : (
                                  <Badge variant="success">Paid</Badge>
                                )}

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    handleCancelAndRefund(booking.id)
                                  }
                                  title="Cancel booking and refund credit points"
                                >
                                  <XCircle className="mr-1 h-4 w-4" />
                                  Cancel & Refund
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Large [Next Patient] Queue Control Button */}
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={busyDoctorId === doctor.id}
                    onClick={() => handleNextPatient(doctor.id, doctor.name)}
                  >
                    <ArrowRightCircle className="mr-2 h-6 w-6" />
                    {busyDoctorId === doctor.id
                      ? "Calling & Notifying..."
                      : `Next Patient (Call #${doctor.current_queue_number + 1})`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: PAYMENT VERIFICATION QUEUE & ALL BOOKINGS MANAGEMENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Payment Receipt Verification Panel */}
        <Card className="lg:col-span-2 border-2 border-slate-300">
          <CardHeader className="border-b-2 border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <Receipt className="h-6 w-6 text-clinic-primary" />
              KPay & WavePay Receipt Verification Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {bookings.filter((b) => b.status !== "cancelled").length === 0 ? (
              <p className="text-base font-semibold text-slate-600">
                No active bookings to display.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const pat = patients.find((p) => p.id === booking.patient_id);
                  const doc = doctors.find((d) => d.id === booking.doctor_id);
                  const tx = transactions.find(
                    (t) => t.booking_id === booking.id
                  );

                  return (
                    <div
                      key={booking.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-black text-white">
                            Queue #{booking.queue_number}
                          </span>
                          <span className="text-lg font-black text-slate-950">
                            {pat?.name || "Patient"}
                          </span>
                          <Badge
                            variant={
                              booking.payment_status === "paid"
                                ? "success"
                                : booking.payment_status === "refunded"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {booking.payment_status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {booking.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          {doc?.name} •{" "}
                          {(tx?.payment_method || "kpay").toUpperCase()} •{" "}
                          {formatCurrency(
                            tx?.amount || doc?.consultation_fee || 15000
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {tx?.receipt_image_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedReceipt({
                                bookingId: booking.id,
                                patientName: pat?.name || "Patient",
                                doctorName: doc?.name || "Doctor",
                                queueNumber: booking.queue_number,
                                amount: tx.amount,
                                paymentMethod: tx.payment_method,
                                imageUrl: tx.receipt_image_url!,
                                paymentStatus: booking.payment_status,
                              })
                            }
                          >
                            <Eye className="mr-1.5 h-4 w-4" />
                            Review Receipt
                          </Button>
                        )}

                        {booking.payment_status === "pending" &&
                          booking.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() =>
                                handleApproveReceipt(
                                  booking.id,
                                  pat?.name || "Patient"
                                )
                              }
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                              Confirm Payment
                            </Button>
                          )}

                        {booking.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCancelAndRefund(booking.id)}
                          >
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Cancel & Refund Points
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Firebase FCM Dispatch Log & Patient Credit Wallets */}
        <div className="space-y-6">
          <Card className="border-2 border-slate-300">
            <CardHeader className="border-b-2 border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <BellRing className="h-5 w-5 text-clinic-primary" />
                Firebase FCM Push Log (Next 3 Patients)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pushLogs.length === 0 ? (
                <p className="text-sm font-semibold text-slate-600">
                  Click [Next Patient] on any doctor card to dispatch FCM push
                  notifications to the next 3 waiting patients.
                </p>
              ) : (
                pushLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-extrabold text-slate-950">
                      {log.doctorName} → Called #{log.calledQueueNumber}
                    </p>
                    <p className="font-semibold text-emerald-800 mt-0.5">
                      Notified:{" "}
                      {log.patientNames.length > 0
                        ? log.patientNames.join(", ")
                        : "Queue Clear"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-300">
            <CardHeader className="border-b-2 border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <Sparkles className="h-5 w-5 text-emerald-700" />
                Patient Credit Point Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                >
                  <div>
                    <p className="font-extrabold text-slate-950 text-sm">
                      {p.name}
                    </p>
                    <p className="text-xs font-bold text-slate-600">
                      {formatPhoneDisplay(p.phone)}
                    </p>
                  </div>
                  <Badge variant="success">
                    {formatCurrency(p.credit_points)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPay / WavePay Receipt Inspection Modal */}
      <Dialog
        open={Boolean(selectedReceipt)}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
      >
        <DialogContent className="max-w-md">
          {selectedReceipt && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Verify {selectedReceipt.paymentMethod.toUpperCase()} Receipt
                </DialogTitle>
                <DialogDescription>
                  Queue #{selectedReceipt.queueNumber} •{" "}
                  {selectedReceipt.patientName} ({selectedReceipt.doctorName})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100 p-2">
                  <img
                    src={selectedReceipt.imageUrl}
                    alt="KPay Receipt"
                    className="mx-auto max-h-80 w-auto object-contain rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-100 p-3 font-bold">
                  <span>Transfer Amount:</span>
                  <span className="text-lg font-black text-slate-950">
                    {formatCurrency(selectedReceipt.amount)}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {selectedReceipt.paymentStatus === "pending" && (
                    <Button
                      variant="success"
                      className="w-full"
                      onClick={() =>
                        handleApproveReceipt(
                          selectedReceipt.bookingId,
                          selectedReceipt.patientName
                        )
                      }
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Approve & Confirm Booking
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      handleCancelAndRefund(selectedReceipt.bookingId);
                      setSelectedReceipt(null);
                    }}
                  >
                    <ShieldAlert className="mr-2 h-5 w-5" />
                    Reject & Refund Points
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
