import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY, CURRENCY_MY } from "@/clinic.config";
import type { Doctor, Lang } from "@/lib/types";
import { toLocalDigits } from "@/lib/date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, lang: Lang = "en"): string {
  const n = Number(amount || 0).toLocaleString("en-US");
  return lang === "my" ? `${toLocalDigits(n, "my")} ${CURRENCY_MY}` : `${n} ${CURRENCY}`;
}

export function formatPhoneDisplay(phone: string): string {
  const cleaned = (phone || "").replace(/\D/g, "");
  if (!cleaned) return phone;
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 7) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 11)}`;
}

export function doctorName(doc: Pick<Doctor, "name" | "name_my">, lang: Lang): string {
  return lang === "my" && doc.name_my ? doc.name_my : doc.name;
}

export function doctorSpecialty(doc: Pick<Doctor, "specialty" | "specialty_my">, lang: Lang): string {
  return lang === "my" && doc.specialty_my ? doc.specialty_my : doc.specialty;
}

export function roomLabel(room: string, lang: Lang): string {
  return lang === "my" ? `အခန်း ${toLocalDigits(room, "my")}` : `Room ${room}`;
}

/** Normalises Myanmar phone numbers: 09xxxxxxx / +959xxxxxxx / 959xxxxxxx -> 09xxxxxxx */
export function normalizePhone(raw: string): string {
  let p = (raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+95")) p = "0" + p.slice(3);
  else if (p.startsWith("95") && p.length > 10) p = "0" + p.slice(2);
  return p.replace(/\D/g, "");
}

export function isValidMyanmarPhone(phone: string): boolean {
  return /^09\d{7,9}$/.test(normalizePhone(phone));
}
