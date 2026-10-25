import { CLINIC_TIMEZONE } from "@/clinic.config";
import type { Doctor, DoctorStatus, Lang } from "@/lib/types";

const MY_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];
const MY_MONTHS = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "ဩဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
];
const EN_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Converts Latin digits to Myanmar digits (၁၂၃) when lang = "my". */
export function toLocalDigits(value: string | number, lang: Lang): string {
  const s = String(value);
  if (lang !== "my") return s;
  return s.replace(/[0-9]/g, (d) => MY_DIGITS[Number(d)]);
}

/** YYYY-MM-DD for "today" in the clinic timezone (not the browser/UTC date). */
export function clinicToday(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

export function formatDate(dateStr: string, lang: Lang): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  if (lang === "my") {
    return `${toLocalDigits(y, "my")} ခုနှစ် ${MY_MONTHS[m - 1]} ${toLocalDigits(d, "my")} ရက်`;
  }
  return `${d} ${EN_MONTHS[m - 1]} ${y}`;
}

export function formatTime12(hhmm: string, lang: Lang): string {
  const [hStr, mStr] = (hhmm || "").split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const m = mStr ?? "00";
  const h12 = ((h + 11) % 12) + 1;
  if (lang === "my") {
    const period = h < 12 ? "နံနက်" : h < 16 ? "နေ့လည်" : h < 19 ? "ညနေ" : "ည";
    return `${period} ${toLocalDigits(h12, "my")}:${toLocalDigits(m, "my")}`;
  }
  return `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

/** The status only applies on the day it was set; otherwise the doctor is "available". */
export function effectiveDoctorStatus(doc: Doctor): DoctorStatus {
  if (doc.status !== "available" && doc.status_date === clinicToday()) return doc.status;
  return "available";
}

/** The doctor's "now serving" number resets every day. */
export function effectiveCurrentNumber(doc: Doctor): number {
  return doc.queue_date === clinicToday() ? doc.current_queue_number : 0;
}
