"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { clinicToday } from "@/lib/date";
import type { Booking, ClinicMessage, Doctor } from "@/lib/types";

export type LiveStatus = "loading" | "ready" | "not_configured" | "db_not_ready" | "error";

const num = (v: unknown, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));

function normDoctor(d: Record<string, unknown>): Doctor {
  return {
    ...(d as unknown as Doctor),
    current_queue_number: num(d.current_queue_number),
    consultation_fee: num(d.consultation_fee),
    max_patients: num(d.max_patients, 30),
    avg_consult_minutes: num(d.avg_consult_minutes, 10),
    delay_minutes: num(d.delay_minutes),
    sort_order: num(d.sort_order),
  };
}

/**
 * Live clinic data (doctors, today's + upcoming bookings, today's messages)
 * with Supabase Realtime + polling fallback.
 */
export function useLiveQueue(opts: { includeArchived?: boolean; onChange?: () => void } = {}) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ClinicMessage[]>([]);
  const [status, setStatus] = useState<LiveStatus>(isSupabaseConfigured ? "loading" : "not_configured");
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(opts.onChange);
  onChangeRef.current = opts.onChange;

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const today = clinicToday();
    let dq = supabase.from("doctors").select("*").order("sort_order").order("name");
    if (!opts.includeArchived) dq = dq.eq("is_archived", false);
    const [d, b, m] = await Promise.all([
      dq,
      supabase.from("bookings").select("*").gte("booking_date", today).order("queue_number").limit(3000),
      supabase.from("messages").select("*").gte("message_date", clinicToday(-1)).order("created_at", { ascending: false }).limit(300),
    ]);
    const err = d.error || b.error || m.error;
    if (err) {
      setStatus(/schema cache|does not exist|relation/i.test(err.message) ? "db_not_ready" : "error");
      return;
    }
    setDoctors((d.data || []).map(normDoctor));
    setBookings((b.data || []) as Booking[]);
    setMessages((m.data || []) as ClinicMessage[]);
    setStatus("ready");
  }, [opts.includeArchived]);

  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      refresh();
      onChangeRef.current?.();
    }, 250);
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return;
    refresh();
    const channel = supabase
      .channel(`clinic-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleRefresh)
      .subscribe((s) => setConnected(s === "SUBSCRIBED"));

    const poll = setInterval(refresh, 30_000); // safety net if realtime drops
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      supabase?.removeChannel(channel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh, scheduleRefresh]);

  return { doctors, bookings, messages, status, connected, refresh };
}
