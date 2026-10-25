"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import QRCode from "qrcode";
import {
  Patient,
  Doctor,
  Booking,
  Transaction,
  ClinicMessage,
  PaymentMethod,
  Lang,
  DoctorStatus,
  ClinicSettings,
  ReceptionNotification,
} from "@/lib/types";
import {
  showLocalNotification,
  ensureBackgroundAlertKeepAlive,
} from "@/lib/firebase";
import {
  CLINIC_CONFIG,
  CLINIC_NAME,
  CLINIC_NAME_MY,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  LOGO_URL,
  DEFAULT_LANGUAGE,
} from "@/clinic.config";
import { clinicToday } from "@/lib/date";
import { templates } from "@/lib/messages";
import {
  useDeviceViewport,
  DeviceViewportInfo,
} from "@/lib/use-device-viewport";

const STORAGE_KEY = "auracare_clinic_state_v3";
const PATIENT_SESSION_KEY = "auracare_current_patient_id_v3";
const LANG_STORAGE_KEY = "auracare_lang_v3";
const CHANNEL_NAME = "auracare_realtime_channel_v3";

const SAMPLE_RECEIPT_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0B5ED7"/>
      <stop offset="100%" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="480" height="640" rx="24" fill="#F8FAFC"/>
  <rect x="24" y="24" width="432" height="592" rx="16" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
  <rect x="24" y="24" width="432" height="115" rx="16" fill="url(#hdr)"/>
  <text x="240" y="72" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="bold">KBZPay / Mobile Banking</text>
  <text x="240" y="106" text-anchor="middle" fill="#E2E8F0" font-family="sans-serif" font-size="16">ငွေလွှဲပြေစာ • Payment Successful</text>
  <circle cx="240" cy="190" r="34" fill="#16A34A"/>
  <path d="M224 190L235 202L258 178" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
  <text x="240" y="268" text-anchor="middle" fill="#0F172A" font-family="sans-serif" font-size="34" font-weight="bold">-15,000 MMK</text>
  <line x1="56" y1="310" x2="424" y2="310" stroke="#E2E8F0" stroke-width="2"/>
  <text x="56" y="355" fill="#475569" font-family="sans-serif" font-size="16">Merchant</text>
  <text x="424" y="355" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">AuraCare Poly Clinic</text>
  <text x="56" y="405" fill="#475569" font-family="sans-serif" font-size="16">Transaction ID</text>
  <text x="424" y="405" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">KPAY-20261025-88392</text>
  <text x="56" y="455" fill="#475569" font-family="sans-serif" font-size="16">Clinic Account</text>
  <text x="424" y="455" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">09777888999</text>
  <text x="56" y="505" fill="#475569" font-family="sans-serif" font-size="16">Purpose</text>
  <text x="424" y="505" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">Clinic Queue Booking</text>
</svg>
`)}`;

const TODAY_STR = clinicToday();

/**
 * Extracts a 2 to 4 letter uppercase prefix from the clinic's name or custom prefix.
 * Example: "Ayeyarwady Specialist Clinic" -> "ASC", "AuraCare Poly Clinic" -> "APC"
 */
export function getClinicCodePrefix(
  clinicName: string,
  customPrefix?: string
): string {
  const cleanedCustom = (customPrefix || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
  if (cleanedCustom.length >= 2 && cleanedCustom.length <= 4) {
    return cleanedCustom;
  }

  const words = (clinicName || "")
    .replace(/[^A-Za-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    const initials = words
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
    if (initials.length >= 2) return initials;
  }

  const lettersOnly = (clinicName || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  if (lettersOnly.length >= 2) {
    return lettersOnly.slice(0, 3);
  }
  return "ASC";
}

export function getYYMMDD(dateStr: string = TODAY_STR): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const yy = parts[0].slice(-2);
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * Generates Patient ID in exact format: [ClinicPrefix(2-4 chars)][YYMMDD][TTTT]
 * where TTTT is the 4-digit daily account creation counter for that date (0001, 0002, ...).
 */
export function generatePatientCode(
  settings: ClinicSettings,
  existingPatients: Patient[],
  dateStr: string = TODAY_STR
): string {
  const prefix = getClinicCodePrefix(
    settings.clinicName,
    settings.clinicCodePrefix
  );
  const yymmdd = getYYMMDD(dateStr);

  let maxDailyCounter = 0;
  for (const p of existingPatients) {
    const code = (p.patient_code || "").toUpperCase();
    const match = code.match(/^[A-Z0-9]{2,4}(\d{6})(\d{4})$/);
    if (match && match[1] === yymmdd) {
      const seq = parseInt(match[2], 10);
      if (!isNaN(seq) && seq > maxDailyCounter) {
        maxDailyCounter = seq;
      }
    }
  }

  const nextCounter = String(maxDailyCounter + 1).padStart(4, "0");
  return `${prefix}${yymmdd}${nextCounter}`;
}

/**
 * Extracts a Patient ID, Ticket Code, or Phone query from raw QR scan text or URL.
 */
export function extractPatientQueryFromQrText(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const pid = url.searchParams.get("pid");
      if (pid) return pid.trim().toUpperCase();
      const code = url.searchParams.get("code");
      if (code) return code.trim().toUpperCase();
    }
  } catch {
    // Not a URL, continue
  }
  // Check if it contains pid= or PATIENT:
  const pidMatch = trimmed.match(/(?:pid=|PATIENT:)([A-Za-z0-9-]+)/i);
  if (pidMatch && pidMatch[1]) {
    return pidMatch[1].toUpperCase();
  }
  return trimmed;
}

export const INITIAL_SETTINGS: ClinicSettings = {
  clinicName: CLINIC_NAME,
  clinicNameMy: CLINIC_NAME_MY,
  clinicCodePrefix: getClinicCodePrefix(CLINIC_NAME),
  subtitleEn: "Pre-Paid Poly Clinic Queue & Appointment System",
  subtitleMy: "ကြိုတင်ဘိုကင်နှင့် တိုက်ရိုက် အလှည့်ကြည့် အထူးကုဆေးခန်းစနစ်",
  logoUrl: LOGO_URL,
  primaryColor: PRIMARY_COLOR,
  secondaryColor: SECONDARY_COLOR,
  defaultFee: CLINIC_CONFIG.defaultConsultationFee,
  clinicPhone: CLINIC_CONFIG.supportPhone,
  addressMy: CLINIC_CONFIG.addressMy,
  addressEn: CLINIC_CONFIG.address,
  receptionPin: "1234",
  superAdminPin: "1234",
  paymentAccounts: {
    kpay: {
      provider: CLINIC_CONFIG.paymentAccounts.kpay.provider,
      accountName: CLINIC_CONFIG.paymentAccounts.kpay.accountName,
      accountNumber: CLINIC_CONFIG.paymentAccounts.kpay.accountNumber,
      color: CLINIC_CONFIG.paymentAccounts.kpay.color,
    },
    wavepay: {
      provider: CLINIC_CONFIG.paymentAccounts.wavepay.provider,
      accountName: CLINIC_CONFIG.paymentAccounts.wavepay.accountName,
      accountNumber: CLINIC_CONFIG.paymentAccounts.wavepay.accountNumber,
      color: CLINIC_CONFIG.paymentAccounts.wavepay.color,
    },
    ayapay: {
      provider: CLINIC_CONFIG.paymentAccounts.ayapay.provider,
      accountName: CLINIC_CONFIG.paymentAccounts.ayapay.accountName,
      accountNumber: CLINIC_CONFIG.paymentAccounts.ayapay.accountNumber,
      color: CLINIC_CONFIG.paymentAccounts.ayapay.color,
    },
  },
};

export interface SpecialtyPreset {
  codePrefix: string;
  specialty_my: string;
  specialty_en: string;
  defaultRoom: string;
  defaultFee: number;
}

export const SPECIALTY_PRESETS: SpecialtyPreset[] = [
  {
    codePrefix: "CARD",
    specialty_my: "နှလုံးနှင့် သွေးတိုး အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Senior Cardiologist (Heart & Blood Pressure)",
    defaultRoom: "101",
    defaultFee: 15000,
  },
  {
    codePrefix: "GEN",
    specialty_my: "အထွေထွေရောဂါနှင့် သက်ကြီးရွယ်အို ကျန်းမာရေး အထူးကု",
    specialty_en: "General Physician & Senior Citizen Care",
    defaultRoom: "102",
    defaultFee: 15000,
  },
  {
    codePrefix: "PED",
    specialty_my: "ကလေးအထူးကု ဆရာဝန်ကြီး",
    specialty_en: "Senior Pediatrician (Child Health Specialist)",
    defaultRoom: "103",
    defaultFee: 15000,
  },
  {
    codePrefix: "OBGYN",
    specialty_my: "သားဖွားနှင့် မီးယပ် အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Obstetrician & Gynecologist (OB/GYN)",
    defaultRoom: "104",
    defaultFee: 20000,
  },
  {
    codePrefix: "ORTHO",
    specialty_my: "အရိုး၊ အကြောနှင့် အဆစ်အမြစ် အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Orthopedic, Bone & Joint Specialist",
    defaultRoom: "105",
    defaultFee: 20000,
  },
  {
    codePrefix: "EYE",
    specialty_my: "မျက်စိနှင့် အတွင်းတိမ် အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Eye & Cataract Specialist (Ophthalmology)",
    defaultRoom: "201",
    defaultFee: 20000,
  },
  {
    codePrefix: "NEURO",
    specialty_my: "ဦးနှောက်နှင့် အာရုံကြော အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Senior Neurologist (Brain & Nerve Specialist)",
    defaultRoom: "202",
    defaultFee: 25000,
  },
  {
    codePrefix: "ENT",
    specialty_my: "နား၊ နှာခေါင်း၊ လည်ချောင်း အထူးကုဆရာဝန်ကြီး",
    specialty_en: "ENT Specialist (Ear, Nose & Throat)",
    defaultRoom: "203",
    defaultFee: 15000,
  },
  {
    codePrefix: "DERM",
    specialty_my: "အရေပြားနှင့် အလှအပရေးရာ အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Consultant Dermatologist (Skin Specialist)",
    defaultRoom: "204",
    defaultFee: 15000,
  },
  {
    codePrefix: "GI",
    specialty_my: "အစာအိမ်၊ အူလမ်းကြောင်းနှင့် အသည်း အထူးကုဆရာဝန်ကြီး",
    specialty_en: "Gastroenterologist & Hepatologist",
    defaultRoom: "205",
    defaultFee: 20000,
  },
];

export function generateDoctorCode(
  specialtyText: string,
  roomNumber?: string,
  fallbackSeq = 1
): string {
  const s = (specialtyText || "").toLowerCase();
  let prefix = "DR";
  if (s.includes("နှလုံး") || s.includes("cardio") || s.includes("heart")) {
    prefix = "CARD";
  } else if (
    s.includes("အထွေထွေ") ||
    s.includes("general") ||
    s.includes("physician")
  ) {
    prefix = "GEN";
  } else if (
    s.includes("ကလေး") ||
    s.includes("pediat") ||
    s.includes("child")
  ) {
    prefix = "PED";
  } else if (
    s.includes("သားဖွား") ||
    s.includes("မီးယပ်") ||
    s.includes("gyne") ||
    s.includes("obstet") ||
    s.includes("og")
  ) {
    prefix = "OBGYN";
  } else if (
    s.includes("အရိုး") ||
    s.includes("ortho") ||
    s.includes("bone") ||
    s.includes("joint")
  ) {
    prefix = "ORTHO";
  } else if (
    s.includes("မျက်စိ") ||
    s.includes("eye") ||
    s.includes("ophthal")
  ) {
    prefix = "EYE";
  } else if (
    s.includes("ဦးနှောက်") ||
    s.includes("အာရုံကြော") ||
    s.includes("neuro")
  ) {
    prefix = "NEURO";
  } else if (s.includes("နား") || s.includes("နှာခေါင်း") || s.includes("ent")) {
    prefix = "ENT";
  } else if (
    s.includes("အရေပြား") ||
    s.includes("derm") ||
    s.includes("skin")
  ) {
    prefix = "DERM";
  } else if (
    s.includes("အစာအိမ်") ||
    s.includes("အသည်း") ||
    s.includes("gastro")
  ) {
    prefix = "GI";
  }
  const cleanRoom = (roomNumber || "").replace(/[^0-9A-Za-z]/g, "");
  const suffix = cleanRoom || String(100 + fallbackSeq);
  return `${prefix}-${suffix}`;
}

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    doctor_code: "CARD-101",
    name: "Dr. Aung Kyaw Moe",
    name_my: "ဒေါက်တာ အောင်ကျော်မိုး",
    specialty: "Senior Cardiologist (Heart & Blood Pressure)",
    specialty_my: "နှလုံးနှင့် သွေးတိုး အထူးကုဆရာဝန်ကြီး",
    room_number: "101",
    current_queue_number: 3,
    queue_date: TODAY_STR,
    consultation_fee: 15000,
    start_time: "09:00",
    end_time: "12:00",
    max_patients: 30,
    avg_consult_minutes: 10,
    status: "available",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: true,
    is_archived: false,
    sort_order: 1,
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    doctor_code: "GEN-102",
    name: "Dr. May Thuzar Win",
    name_my: "ဒေါက်တာ မေသူဇာဝင်း",
    specialty: "General Physician & Senior Citizen Care",
    specialty_my: "အထွေထွေရောဂါနှင့် သက်ကြီးရွယ်အို ကျန်းမာရေး အထူးကု",
    room_number: "102",
    current_queue_number: 5,
    queue_date: TODAY_STR,
    consultation_fee: 15000,
    start_time: "09:00",
    end_time: "13:00",
    max_patients: 40,
    avg_consult_minutes: 8,
    status: "available",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: true,
    is_archived: false,
    sort_order: 2,
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    doctor_code: "ORTHO-105",
    name: "Dr. Zaw Min Tun",
    name_my: "ဒေါက်တာ ဇော်မင်းထွန်း",
    specialty: "Orthopedic, Bone & Joint Specialist",
    specialty_my: "အရိုး၊ အကြောနှင့် အဆစ်အမြစ် အထူးကုဆရာဝန်ကြီး",
    room_number: "105",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 20000,
    start_time: "13:00",
    end_time: "16:00",
    max_patients: 25,
    avg_consult_minutes: 12,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: true,
    is_archived: false,
    sort_order: 3,
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    doctor_code: "EYE-201",
    name: "Dr. Khin Myat Noe",
    name_my: "ဒေါက်တာ ခင်မြတ်နိုး",
    specialty: "Eye & Cataract Specialist (Ophthalmology)",
    specialty_my: "မျက်စိနှင့် အတွင်းတိမ် အထူးကုဆရာဝန်ကြီး",
    room_number: "201",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 20000,
    start_time: "14:00",
    end_time: "17:00",
    max_patients: 25,
    avg_consult_minutes: 10,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: true,
    is_archived: false,
    sort_order: 4,
  },
  // Saved Past Doctors who have practiced at this clinic (selectable by Name, Specialty & Code)
  {
    id: "11111111-1111-4111-8111-111111111105",
    doctor_code: "PED-103",
    name: "Dr. Thant Zin Oo",
    name_my: "ဒေါက်တာ သန့်ဇင်ဦး",
    specialty: "Senior Pediatrician (Child Health Specialist)",
    specialty_my: "ကလေးအထူးကု ဆရာဝန်ကြီး",
    room_number: "103",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 15000,
    start_time: "10:00",
    end_time: "13:00",
    max_patients: 30,
    avg_consult_minutes: 10,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: false,
    is_archived: true,
    sort_order: 5,
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    doctor_code: "OBGYN-104",
    name: "Dr. Su Myat Mon",
    name_my: "ဒေါက်တာ စုမြတ်မွန်",
    specialty: "Obstetrician & Gynecologist (OB/GYN)",
    specialty_my: "သားဖွားနှင့် မီးယပ် အထူးကုဆရာဝန်ကြီး",
    room_number: "104",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 20000,
    start_time: "15:00",
    end_time: "18:00",
    max_patients: 25,
    avg_consult_minutes: 12,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: false,
    is_archived: true,
    sort_order: 6,
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    doctor_code: "NEURO-202",
    name: "Dr. Kyaw Zayar",
    name_my: "ဒေါက်တာ ကျော်ဇေယျ",
    specialty: "Senior Neurologist (Brain & Nerve Specialist)",
    specialty_my: "ဦးနှောက်နှင့် အာရုံကြော အထူးကုဆရာဝန်ကြီး",
    room_number: "202",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 25000,
    start_time: "16:00",
    end_time: "19:00",
    max_patients: 20,
    avg_consult_minutes: 15,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: false,
    is_archived: true,
    sort_order: 7,
  },
  {
    id: "11111111-1111-4111-8111-111111111108",
    doctor_code: "ENT-203",
    name: "Dr. Hnin Wai Lwin",
    name_my: "ဒေါက်တာ နှင်းဝေလွင်",
    specialty: "ENT Specialist (Ear, Nose & Throat)",
    specialty_my: "နား၊ နှာခေါင်း၊ လည်ချောင်း အထူးကုဆရာဝန်ကြီး",
    room_number: "203",
    current_queue_number: 0,
    queue_date: TODAY_STR,
    consultation_fee: 15000,
    start_time: "11:00",
    end_time: "14:00",
    max_patients: 30,
    avg_consult_minutes: 10,
    status: "not_arrived",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: false,
    is_archived: true,
    sort_order: 8,
  },
];

const INITIAL_PREFIX = getClinicCodePrefix(CLINIC_NAME);
const INITIAL_YYMMDD = getYYMMDD(TODAY_STR);

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    patient_code: `${INITIAL_PREFIX}${INITIAL_YYMMDD}0001`,
    phone: "095123456",
    name: "ဦးဘလှိုင် (U Ba Hlaing)",
    credit_points: 0,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    patient_code: `${INITIAL_PREFIX}${INITIAL_YYMMDD}0002`,
    phone: "0942001122",
    name: "ဒေါ်မြစိန် (Daw Mya Sein)",
    credit_points: 0,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    patient_code: `${INITIAL_PREFIX}${INITIAL_YYMMDD}0003`,
    phone: "0979887766",
    name: "ဦးတင်ဦး (U Tin Oo)",
    credit_points: 0,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    patient_code: `${INITIAL_PREFIX}${INITIAL_YYMMDD}0004`,
    phone: "0997112233",
    name: "ဒေါ်ခင်စော (Daw Khin Saw)",
    credit_points: 0,
    fcm_token: null,
    preferred_language: "my",
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    patient_id: "22222222-2222-4222-8222-222222222202",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 3,
    status: "in_progress",
    payment_status: "paid",
    ticket_code: "AC-101-3",
    source: "online",
    is_priority: false,
    checked_in_at: new Date(Date.now() - 40 * 60000).toISOString(),
    called_at: new Date(Date.now() - 5 * 60000).toISOString(),
    notified_near_at: new Date(Date.now() - 20 * 60000).toISOString(),
    qr_image_url: null,
    cancel_requested: false,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333302",
    patient_id: "22222222-2222-4222-8222-222222222203",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 4,
    status: "waiting",
    payment_status: "pending",
    ticket_code: "AC-101-4",
    source: "online",
    is_priority: false,
    checked_in_at: null,
    called_at: null,
    notified_near_at: null,
    qr_image_url: null,
    cancel_requested: false,
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    patient_id: "22222222-2222-4222-8222-222222222204",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 5,
    status: "waiting",
    payment_status: "paid",
    ticket_code: "AC-101-5",
    source: "online",
    is_priority: false,
    checked_in_at: null,
    called_at: null,
    notified_near_at: null,
    qr_image_url: null,
    cancel_requested: false,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "44444444-4444-4444-8444-444444444401",
    patient_id: "22222222-2222-4222-8222-222222222203",
    booking_id: "33333333-3333-4333-8333-333333333302",
    amount: 15000,
    payment_method: "kpay",
    receipt_image_url: SAMPLE_RECEIPT_SVG,
    type: "payment",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "44444444-4444-4444-8444-444444444402",
    patient_id: "22222222-2222-4222-8222-222222222204",
    booking_id: "33333333-3333-4333-8333-333333333303",
    amount: 15000,
    payment_method: "credit_points",
    receipt_image_url: null,
    type: "payment",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

export const INITIAL_MESSAGES: ClinicMessage[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_id: null,
    patient_id: null,
    kind: "automated",
    category: "available",
    title_en: "Doctor has arrived",
    body_en:
      "Dr. Aung Kyaw Moe has arrived and is now seeing patients in Room 101.",
    title_my: "ဆရာဝန်ကြီး ရောက်ရှိပါပြီ",
    body_my:
      "ဒေါက်တာ အောင်ကျော်မိုး ရောက်ရှိပြီး အခန်း ၁၀၁ တွင် လူနာများကို စတင် ကြည့်ရှုနေပါပြီ။",
    message_date: TODAY_STR,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

export interface PersistedClinicState {
  version: number;
  settings: ClinicSettings;
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  messages: ClinicMessage[];
  receptionNotifications?: ReceptionNotification[];
}

export interface DoctorFormInput {
  doctor_code?: string;
  name: string;
  name_my: string;
  specialty: string;
  specialty_my: string;
  room_number: string;
  consultation_fee: number;
  start_time: string;
  end_time: string;
  max_patients?: number;
  avg_consult_minutes?: number;
  is_active?: boolean;
}

interface ClinicContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  viewport: DeviceViewportInfo;
  settings: ClinicSettings;
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  messages: ClinicMessage[];
  receptionNotifications: ReceptionNotification[];
  currentPatient: Patient | null;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  loginWithPhoneOtp: (phone: string, name?: string) => Promise<Patient>;
  loginOrRegisterPatient: (params: {
    mode: "register_or_phone" | "returning_id";
    phone?: string;
    name?: string;
    patientCode?: string;
  }) => Promise<{ patient: Patient; isNewAccount: boolean }>;
  updatePatientPhoneByReception: (params: {
    patientId: string;
    newPhone: string;
    nrcOrLicense: string;
    newName?: string;
  }) => Promise<Patient>;
  logoutPatient: () => void;
  createBooking: (params: {
    doctorId: string;
    paymentMethod: "kpay" | "wavepay" | "ayapay" | "credit_points";
    receiptFile?: File | null;
  }) => Promise<Booking>;
  createWalkInBooking: (params: {
    doctorId: string;
    existingPatientId?: string | null;
    patientName: string;
    patientPhone: string;
    isPriority: boolean;
    paymentMethod: "cash" | "credit_points" | "kpay" | "wavepay" | "ayapay";
  }) => Promise<Booking>;
  advanceDoctorQueue: (doctorId: string) => Promise<{
    newQueueNumber: number;
    notifiedPatients: string[];
  }>;
  setCustomQueueNumber: (doctorId: string, queueNumber: number) => Promise<void>;
  verifyReceiptAndConfirmBooking: (bookingId: string) => Promise<void>;
  requestPatientBookingCancel: (bookingId: string) => Promise<void>;
  cancelBookingAndRefund: (
    bookingId: string,
    options?: {
      grantCreditPoints?: boolean;
      rejectRequestOnly?: boolean;
    }
  ) => Promise<{
    refundedAmount: number;
    patientName: string;
    action: "refunded" | "cancelled_no_credit" | "rejected";
  }>;
  markReceptionNotificationRead: (notificationId: string) => Promise<void>;
  clearReceptionNotifications: () => Promise<void>;
  addDoctor: (input: DoctorFormInput) => Promise<Doctor>;
  updateDoctor: (
    doctorId: string,
    input: Partial<DoctorFormInput>
  ) => Promise<void>;
  removeDoctor: (doctorId: string) => Promise<void>;
  activateSavedDoctorForToday: (
    doctorId: string,
    overrides?: Partial<DoctorFormInput>
  ) => Promise<Doctor | null>;
  markDoctorArrivedAndStartQueue: (doctorId: string) => Promise<{
    newQueueNumber: number;
  }>;
  updateDoctorSessionStatus: (
    doctorId: string,
    params: {
      status: DoctorStatus;
      delayMinutes?: number;
      postponedTo?: string | null;
      note?: string | null;
    }
  ) => Promise<void>;
  sendClinicMessage: (params: {
    doctorId?: string | null;
    bookingId?: string | null;
    patientId?: string | null;
    titleMy: string;
    bodyMy: string;
    titleEn?: string;
    bodyEn?: string;
    kind?: "manual" | "automated";
  }) => Promise<ClinicMessage>;
  addDemoCreditPoints: (amount: number) => Promise<void>;
  updateClinicSettings: (partial: Partial<ClinicSettings>) => Promise<void>;
  updateReceptionPin: (currentPin: string, newPin: string) => Promise<boolean>;
  updateSuperAdminPin: (currentPin: string, newPin: string) => Promise<boolean>;
  adjustPatientCredits: (
    patientId: string,
    newCreditPoints: number
  ) => Promise<void>;
  resetDemoData: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

export async function uploadImageToCloudinaryOrDataUrl(
  file: File,
  folder: "receipts" | "tickets" | "branding" = "receipts"
): Promise<string> {
  // 1. Primary: Signed Server-Side Cloudinary Upload (/api/upload)
  try {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.url) return json.url as string;
    }
  } catch {
    // Fall back to Data URL if offline
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

async function generateTicketQrDataUrl(
  bookingId: string,
  ticketCode: string,
  patientCode?: string
): Promise<string> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const pidParam = patientCode ? `&pid=${encodeURIComponent(patientCode)}` : "";
  const ticketUrl = `${origin}/ticket/${bookingId}?code=${ticketCode}${pidParam}`;
  const dataUrl = await QRCode.toDataURL(ticketUrl, {
    width: 360,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  // Upload QR pass image to Cloudinary via signed server route
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        folder: "tickets",
        fileName: `qr-${ticketCode}-${bookingId.slice(0, 8)}.png`,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.ok && json.url) return json.url as string;
    }
  } catch {
    // Keep dataUrl if offline
  }

  return dataUrl;
}

export async function generatePatientIdQrDataUrl(
  patientCode: string
): Promise<string> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const qrPayload = `${origin}/?pid=${encodeURIComponent(patientCode)}`;
  return QRCode.toDataURL(qrPayload, {
    width: 340,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const viewport = useDeviceViewport();
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANGUAGE);
  const [settings, setSettings] = useState<ClinicSettings>(INITIAL_SETTINGS);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [messages, setMessages] = useState<ClinicMessage[]>(INITIAL_MESSAGES);
  const [receptionNotifications, setReceptionNotifications] = useState<
    ReceptionNotification[]
  >([]);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  const versionRef = useRef<number>(0);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const applyIncomingState = useCallback((incoming: PersistedClinicState) => {
    if (!incoming || typeof incoming !== "object") return;
    const incomingVersion = Number(incoming.version || 0);
    if (incomingVersion > 0 && incomingVersion < versionRef.current) {
      return;
    }
    versionRef.current = incomingVersion || Date.now();
    const resolvedSettings = incoming.settings
      ? { ...INITIAL_SETTINGS, ...incoming.settings }
      : INITIAL_SETTINGS;
    if (incoming.settings) {
      setSettings((prev) => ({ ...prev, ...incoming.settings }));
    }
    if (Array.isArray(incoming.doctors)) setDoctors(incoming.doctors);
    if (Array.isArray(incoming.patients)) {
      const normalizedPatients: Patient[] = [];
      for (const p of incoming.patients) {
        if (p.patient_code) {
          normalizedPatients.push(p);
        } else {
          const code = generatePatientCode(
            resolvedSettings,
            normalizedPatients
          );
          normalizedPatients.push({ ...p, patient_code: code });
        }
      }
      setPatients(normalizedPatients);
    }
    if (Array.isArray(incoming.bookings)) setBookings(incoming.bookings);
    if (Array.isArray(incoming.transactions))
      setTransactions(incoming.transactions);
    if (Array.isArray(incoming.messages)) setMessages(incoming.messages);
    if (Array.isArray(incoming.receptionNotifications)) {
      setReceptionNotifications(incoming.receptionNotifications);
    }
  }, []);

  const persistState = useCallback(
    (next: Omit<PersistedClinicState, "version">) => {
      const nextVersion = Math.max(Date.now(), versionRef.current + 1);
      versionRef.current = nextVersion;
      const fullPayload: PersistedClinicState = {
        ...next,
        version: nextVersion,
      };

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPayload));
        } catch {
          // Ignore quota errors
        }
        try {
          broadcastRef.current?.postMessage({
            type: "SYNC_STATE",
            payload: fullPayload,
          });
        } catch {
          // Ignore BroadcastChannel errors
        }
        fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fullPayload),
        }).catch(() => {});
      }
    },
    []
  );

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    }
  }, []);

  // Sync from Server API + BroadcastChannel + Storage Events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (savedLang === "my" || savedLang === "en") {
      setLangState(savedLang);
    }

    const savedPatientId = localStorage.getItem(PATIENT_SESSION_KEY);
    if (savedPatientId) {
      setCurrentPatientId(savedPatientId);
    }

    // 1. Load local state first for instant render
    let localLoaded: PersistedClinicState | null = null;
    const savedStateRaw = localStorage.getItem(STORAGE_KEY);
    if (savedStateRaw) {
      try {
        localLoaded = JSON.parse(savedStateRaw) as PersistedClinicState;
        applyIncomingState(localLoaded);
      } catch {
        // Ignore invalid storage
      }
    }

    // 2. Fetch authoritative server state (or seed server if empty)
    const syncFromServer = async () => {
      try {
        const res = await fetch(`/api/state?since=${versionRef.current}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsRealtimeConnected(true);

        if (!data.hasState) {
          const initialPayload: PersistedClinicState = localLoaded || {
            version: Date.now(),
            settings: INITIAL_SETTINGS,
            patients: INITIAL_PATIENTS,
            doctors: INITIAL_DOCTORS,
            bookings: INITIAL_BOOKINGS,
            transactions: INITIAL_TRANSACTIONS,
            messages: INITIAL_MESSAGES,
            receptionNotifications: [],
          };
          versionRef.current = initialPayload.version;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPayload));
          await fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(initialPayload),
          });
        } else if (!data.unchanged && data.state) {
          const serverState = data.state as PersistedClinicState;
          if (Number(serverState.version || 0) > versionRef.current) {
            applyIncomingState(serverState);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(serverState));
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Offline ready
      } finally {
        setIsLoading(false);
      }
    };

    syncFromServer();

    // 3. Fast 1-second live polling so all windows/devices/tabs stay 100% in sync
    const pollInterval = window.setInterval(syncFromServer, 1000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        syncFromServer();
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    // 4. Instant 0ms BroadcastChannel for same-browser tabs
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "SYNC_STATE" && event.data?.payload) {
          applyIncomingState(event.data.payload as PersistedClinicState);
        }
      };
      broadcastRef.current = bc;
    }

    // 5. Instant Storage Event listener
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue) as PersistedClinicState;
          applyIncomingState(p);
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorageEvent);
      broadcastRef.current?.close();
    };
  }, [applyIncomingState]);

  const currentPatient =
    patients.find((p) => p.id === currentPatientId) || null;

  // Real-time Patient Phone Push & "တီ — တီ!" Alert Engine when new messages arrive from Reception
  const seenMessageIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!currentPatient) return;
    ensureBackgroundAlertKeepAlive();

    if (seenMessageIdsRef.current === null) {
      seenMessageIdsRef.current = new Set(messages.map((m) => m.id));
      return;
    }

    const activePatientDoctorIds = new Set(
      bookings
        .filter(
          (b) =>
            b.patient_id === currentPatient.id &&
            b.status !== "cancelled" &&
            b.status !== "no_show"
        )
        .map((b) => b.doctor_id)
    );

    for (const msg of messages) {
      if (seenMessageIdsRef.current.has(msg.id)) continue;
      seenMessageIdsRef.current.add(msg.id);

      const isForThisPatient = msg.patient_id === currentPatient.id;
      const isGlobalBroadcast = !msg.doctor_id && !msg.patient_id;
      const isForPatientDoctor =
        Boolean(msg.doctor_id) &&
        activePatientDoctorIds.has(msg.doctor_id!) &&
        (!msg.patient_id || msg.patient_id === currentPatient.id);

      if (isForThisPatient || isGlobalBroadcast || isForPatientDoctor) {
        showLocalNotification(
          lang === "my" ? msg.title_my : msg.title_en,
          lang === "my" ? msg.body_my : msg.body_en,
          msg.id
        );
      }
    }
  }, [messages, currentPatient, bookings, lang]);

  const loginOrRegisterPatient = useCallback(
    async ({
      mode,
      phone,
      name,
      patientCode,
    }: {
      mode: "register_or_phone" | "returning_id";
      phone?: string;
      name?: string;
      patientCode?: string;
    }): Promise<{ patient: Patient; isNewAccount: boolean }> => {
      ensureBackgroundAlertKeepAlive();
      const cleanedCode = extractPatientQueryFromQrText(
        patientCode || ""
      ).toUpperCase();
      const normalizedPhone = (phone || "").replace(/\D/g, "");
      const trimmedName = (name || "").trim();

      let matched: Patient | undefined;
      let isNewAccount = false;

      if (mode === "returning_id" || cleanedCode) {
        if (!cleanedCode) {
          throw new Error(
            lang === "my"
              ? "ကျေးဇူးပြု၍ လူနာ ID နံပါတ် ရိုက်ထည့်ပေးပါ။"
              : "Please enter your Patient ID."
          );
        }
        matched = patients.find(
          (p) => (p.patient_code || "").toUpperCase() === cleanedCode
        );
        if (!matched) {
          throw new Error(
            lang === "my"
              ? `လူနာ ID (${cleanedCode}) ဖြင့် အကောင့်မတွေ့ရှိပါ။ ID နံပါတ် ပြန်စစ်ဆေးပါ သို့မဟုတ် Reception တွင် မေးမြန်းပါ။`
              : `No patient account found with ID (${cleanedCode}). Please check your ID or ask Reception.`
          );
        }
        // Optional verification: if user also entered phone or name, check that at least one matches or allow ID login
        if (normalizedPhone && matched.phone.replace(/\D/g, "") !== normalizedPhone) {
          // If phone differs, check if name matches (e.g. they remember ID + name)
          const nameMatches =
            trimmedName &&
            matched.name.toLowerCase().includes(trimmedName.toLowerCase());
          if (!nameMatches) {
            throw new Error(
              lang === "my"
                ? `ဤလူနာ ID (${cleanedCode}) နှင့် ချိတ်ဆက်ထားသော ဖုန်းနံပါတ် မတူညီပါ။ ဖုန်းနံပါတ် ပြောင်းထားပါက Reception ကောင်တာတွင် မှတ်ပုံတင်/လိုင်စင်ပြ၍ ဖုန်းနံပါတ်အသစ် ပြောင်းလဲနိုင်ပါသည်။`
                : `Phone number does not match Patient ID (${cleanedCode}). If you changed your phone number, please ask Reception to update it with your NRC/License.`
            );
          }
        }
      } else {
        if (normalizedPhone.length < 7) {
          throw new Error(
            lang === "my"
              ? "ကျေးဇူးပြု၍ ဖုန်းနံပါတ် မှန်ကန်စွာ ရိုက်ထည့်ပါ။"
              : "Please enter a valid mobile phone number."
          );
        }
        if (!trimmedName) {
          throw new Error(
            lang === "my"
              ? "ကျေးဇူးပြု၍ လူနာအမည် ရိုက်ထည့်ပေးပါ။"
              : "Please enter the patient's full name."
          );
        }

        matched = patients.find(
          (p) => p.phone.replace(/\D/g, "") === normalizedPhone
        );
      }

      let nextPatients: Patient[];
      if (matched) {
        const ensuredCode =
          matched.patient_code || generatePatientCode(settings, patients);
        const qrCardUrl =
          matched.qr_card_url ||
          (await generatePatientIdQrDataUrl(ensuredCode).catch(() => null));
        matched = {
          ...matched,
          patient_code: ensuredCode,
          name: trimmedName || matched.name,
          qr_card_url: qrCardUrl,
          preferred_language: lang,
        };
        nextPatients = patients.map((p) =>
          p.id === matched!.id ? matched! : p
        );
      } else {
        // New account registration: auto-generate Patient ID ([ClinicPrefix]YYMMDDTTTT) and 0 credit points
        isNewAccount = true;
        const newPatientCode = generatePatientCode(settings, patients);
        const qrCardUrl = await generatePatientIdQrDataUrl(
          newPatientCode
        ).catch(() => null);
        matched = {
          id: crypto.randomUUID(),
          patient_code: newPatientCode,
          phone: normalizedPhone,
          name: trimmedName || `လူနာ (${normalizedPhone.slice(-4)})`,
          credit_points: 0,
          fcm_token: null,
          preferred_language: lang,
          qr_card_url: qrCardUrl,
          created_at: new Date().toISOString(),
        };
        nextPatients = [...patients, matched];
      }

      setPatients(nextPatients);
      setCurrentPatientId(matched.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(PATIENT_SESSION_KEY, matched.id);
      }

      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });

      return { patient: matched, isNewAccount };
    },
    [
      patients,
      settings,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      lang,
      persistState,
    ]
  );

  const loginWithPhoneOtp = useCallback(
    async (phone: string, name?: string): Promise<Patient> => {
      const res = await loginOrRegisterPatient({
        mode: "register_or_phone",
        phone,
        name: name?.trim() || `လူနာ (${phone.replace(/\D/g, "").slice(-4)})`,
      });
      return res.patient;
    },
    [loginOrRegisterPatient]
  );

  const updatePatientPhoneByReception = useCallback(
    async ({
      patientId,
      newPhone,
      nrcOrLicense,
      newName,
    }: {
      patientId: string;
      newPhone: string;
      nrcOrLicense: string;
      newName?: string;
    }): Promise<Patient> => {
      const target = patients.find((p) => p.id === patientId);
      if (!target) {
        throw new Error(
          lang === "my" ? "လူနာအကောင့် မတွေ့ရှိပါ။" : "Patient not found."
        );
      }

      const cleanedNewPhone = newPhone.replace(/\D/g, "");
      if (cleanedNewPhone.length < 7) {
        throw new Error(
          lang === "my"
            ? "ဖုန်းနံပါတ်အသစ်ကို မှန်ကန်စွာ ရိုက်ထည့်ပါ။"
            : "Please enter a valid new phone number."
        );
      }

      if (!nrcOrLicense.trim()) {
        throw new Error(
          lang === "my"
            ? "လူနာ၏ မှတ်ပုံတင်အမှတ် သို့မဟုတ် ယာဉ်မောင်းလိုင်စင်အမှတ်ကို ရိုက်ထည့်အတည်ပြုပေးပါ။"
            : "Please enter the patient's NRC or Driver's License number for verification."
        );
      }

      const duplicate = patients.find(
        (p) =>
          p.id !== patientId && p.phone.replace(/\D/g, "") === cleanedNewPhone
      );
      if (duplicate) {
        throw new Error(
          lang === "my"
            ? `ဤဖုန်းနံပါတ် (${cleanedNewPhone}) ကို အခြားလူနာ (${duplicate.name} • ${duplicate.patient_code}) မှ အသုံးပြုထားပြီးဖြစ်ပါသည်။`
            : `This phone number (${cleanedNewPhone}) is already linked to another patient (${duplicate.name}).`
        );
      }

      const prevPhones = Array.from(
        new Set([...(target.previous_phones || []), target.phone])
      );
      const updatedPatient: Patient = {
        ...target,
        phone: cleanedNewPhone,
        name: newName?.trim() ? newName.trim() : target.name,
        nrc_or_license: nrcOrLicense.trim(),
        previous_phones: prevPhones,
      };

      const nextPatients = patients.map((p) =>
        p.id === patientId ? updatedPatient : p
      );

      const verifyMsg: ClinicMessage = {
        id: crypto.randomUUID(),
        doctor_id: null,
        booking_id: null,
        patient_id: updatedPatient.id,
        kind: "automated",
        category: "info",
        title_my: "ဖုန်းနံပါတ်အသစ် ပြောင်းလဲချိတ်ဆက်ပြီးပါပြီ",
        body_my: `လူနာ ID (${updatedPatient.patient_code}) အတွက် မှတ်ပုံတင်/လိုင်စင် (${updatedPatient.nrc_or_license}) စစ်ဆေးပြီး ဖုန်းနံပါတ်အသစ် (${cleanedNewPhone}) သို့ ပြောင်းလဲပေးပြီးပါပြီ။ လက်ကျန်ပွိုင့် ${updatedPatient.credit_points.toLocaleString()} MMK အပြည့်အဝ ပြန်လည်အသုံးပြုနိုင်ပါပြီ။`,
        title_en: "Phone Number Updated & Account Recovered",
        body_en: `Your Patient ID (${updatedPatient.patient_code}) has been linked to your new phone (${cleanedNewPhone}) after NRC/License verification. All ${updatedPatient.credit_points.toLocaleString()} MMK Credit Points are ready to use.`,
        message_date: TODAY_STR,
        created_at: new Date().toISOString(),
      };

      const nextMessages = [verifyMsg, ...messages];
      setPatients(nextPatients);
      setMessages(nextMessages);

      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages: nextMessages,
        receptionNotifications,
      });

      return updatedPatient;
    },
    [
      patients,
      settings,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      lang,
      persistState,
    ]
  );

  const logoutPatient = useCallback(() => {
    setCurrentPatientId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PATIENT_SESSION_KEY);
    }
  }, []);

  const createBooking = useCallback(
    async ({
      doctorId,
      paymentMethod,
      receiptFile,
    }: {
      doctorId: string;
      paymentMethod: "kpay" | "wavepay" | "ayapay" | "credit_points";
      receiptFile?: File | null;
    }): Promise<Booking> => {
      if (!currentPatient) {
        throw new Error(
          lang === "my"
            ? "ကျေးဇူးပြု၍ ဖုန်းနံပါတ်ဖြင့် အရင် ဝင်ရောက်ပေးပါ။"
            : "Please sign in with your phone number first."
        );
      }

      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) {
        throw new Error("Selected doctor was not found.");
      }

      const fee = doctor.consultation_fee || settings.defaultFee;

      if (
        paymentMethod === "credit_points" &&
        currentPatient.credit_points < fee
      ) {
        throw new Error(
          lang === "my"
            ? "Credit Points လက်ကျန် မလုံလောက်ပါ။"
            : "Insufficient Credit Points for 1-click checkout."
        );
      }

      let receiptImageUrl: string | null = null;
      if (paymentMethod !== "credit_points") {
        if (!receiptFile) {
          throw new Error(
            lang === "my"
              ? "ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ (Screenshot) ပုံကို အရင် ရွေးချယ်တင်ပေးပါ။"
              : "Please upload your payment receipt screenshot first."
          );
        }
        receiptImageUrl = await uploadImageToCloudinaryOrDataUrl(
          receiptFile,
          "receipts"
        );
      }

      const doctorBookingsToday = bookings.filter(
        (b) => b.doctor_id === doctorId && b.booking_date === TODAY_STR
      );
      const highestBookedQueue = doctorBookingsToday.reduce(
        (max, b) => Math.max(max, b.queue_number),
        doctor.current_queue_number
      );
      const nextQueueNumber = highestBookedQueue + 1;
      const bookingId = crypto.randomUUID();
      const ticketCode = `AC-${doctor.room_number}-${nextQueueNumber}`;
      const qrDataUrl = await generateTicketQrDataUrl(
        bookingId,
        ticketCode,
        currentPatient.patient_code
      );

      // Mark any older completed bookings for this patient as archived so the new booking is active
      const cleanedOldBookings = bookings.map((b) =>
        b.patient_id === currentPatient.id && b.status === "completed"
          ? { ...b, status: "no_show" as const }
          : b
      );

      // Crucial: Patient-submitted bookings are ALWAYS "pending" until Reception explicitly confirms!
      const newBooking: Booking = {
        id: bookingId,
        patient_id: currentPatient.id,
        doctor_id: doctorId,
        booking_date: TODAY_STR,
        queue_number: nextQueueNumber,
        status: "waiting",
        payment_status: "pending",
        ticket_code: ticketCode,
        source: "online",
        is_priority: false,
        checked_in_at: null,
        called_at: null,
        notified_near_at: null,
        qr_image_url: qrDataUrl,
        cancel_requested: false,
        created_at: new Date().toISOString(),
      };

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        patient_id: currentPatient.id,
        booking_id: newBooking.id,
        amount: fee,
        payment_method: paymentMethod,
        receipt_image_url: receiptImageUrl,
        type: "payment",
        created_at: new Date().toISOString(),
      };

      // Create prominent Reception notification for this new online booking
      const newRecNotif: ReceptionNotification = {
        id: crypto.randomUUID(),
        type: "new_booking",
        booking_id: newBooking.id,
        patient_id: currentPatient.id,
        patient_code: currentPatient.patient_code,
        patient_name: currentPatient.name,
        patient_phone: currentPatient.phone,
        doctor_id: doctor.id,
        doctor_name_my: doctor.name_my || doctor.name,
        doctor_name_en: doctor.name,
        room_number: doctor.room_number,
        queue_number: nextQueueNumber,
        payment_method: paymentMethod,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const nextPatients =
        paymentMethod === "credit_points"
          ? patients.map((p) =>
              p.id === currentPatient.id
                ? { ...p, credit_points: Math.max(0, p.credit_points - fee) }
                : p
            )
          : patients;

      const nextBookings = [...cleanedOldBookings, newBooking];
      const nextTransactions = [newTransaction, ...transactions];
      const nextRecNotifs = [newRecNotif, ...receptionNotifications].slice(
        0,
        40
      );

      setPatients(nextPatients);
      setBookings(nextBookings);
      setTransactions(nextTransactions);
      setReceptionNotifications(nextRecNotifs);

      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages,
        receptionNotifications: nextRecNotifs,
      });

      return newBooking;
    },
    [
      currentPatient,
      doctors,
      settings,
      bookings,
      patients,
      transactions,
      messages,
      receptionNotifications,
      lang,
      persistState,
    ]
  );

  const createWalkInBooking = useCallback(
    async ({
      doctorId,
      existingPatientId = null,
      patientName,
      patientPhone,
      isPriority,
      paymentMethod,
    }: {
      doctorId: string;
      existingPatientId?: string | null;
      patientName: string;
      patientPhone: string;
      isPriority: boolean;
      paymentMethod: "cash" | "credit_points" | "kpay" | "wavepay" | "ayapay";
    }): Promise<Booking> => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) throw new Error("Doctor not found");

      const fee = doctor.consultation_fee || settings.defaultFee;
      let pat: Patient | undefined;
      let nextPatients = [...patients];

      if (existingPatientId) {
        pat = patients.find((p) => p.id === existingPatientId);
      }

      if (!pat) {
        const cleanedPhone =
          patientPhone.replace(/\D/g, "") ||
          `09${Math.floor(100000000 + Math.random() * 900000000)}`;
        pat = patients.find(
          (p) => p.phone.replace(/\D/g, "") === cleanedPhone
        );
        if (!pat) {
          const newPatientCode = generatePatientCode(settings, nextPatients);
          const qrCardUrl = await generatePatientIdQrDataUrl(
            newPatientCode
          ).catch(() => null);
          pat = {
            id: crypto.randomUUID(),
            patient_code: newPatientCode,
            phone: cleanedPhone,
            name: patientName.trim() || `လူနာ (${cleanedPhone.slice(-4)})`,
            credit_points: 0,
            fcm_token: null,
            preferred_language: "my",
            qr_card_url: qrCardUrl,
            created_at: new Date().toISOString(),
          };
          nextPatients.push(pat);
        }
      }

      if (paymentMethod === "credit_points") {
        if (pat.credit_points < fee) {
          throw new Error(
            lang === "my"
              ? `လူနာ (${pat.name}) ၏ Credit Points လက်ကျန် မလုံလောက်ပါ။`
              : `Patient (${pat.name}) does not have enough Credit Points.`
          );
        }
        nextPatients = nextPatients.map((p) =>
          p.id === pat!.id
            ? { ...p, credit_points: Math.max(0, p.credit_points - fee) }
            : p
        );
      }

      const doctorBookingsToday = bookings.filter(
        (b) => b.doctor_id === doctorId && b.booking_date === TODAY_STR
      );
      const highestBookedQueue = doctorBookingsToday.reduce(
        (max, b) => Math.max(max, b.queue_number),
        doctor.current_queue_number
      );
      const nextQueueNumber = highestBookedQueue + 1;
      const bookingId = crypto.randomUUID();
      const ticketCode = `${isPriority ? "VIP" : "RC"}-${
        doctor.room_number
      }-${nextQueueNumber}`;
      const qrDataUrl = await generateTicketQrDataUrl(
        bookingId,
        ticketCode,
        pat.patient_code
      );

      const newBooking: Booking = {
        id: bookingId,
        patient_id: pat.id,
        doctor_id: doctorId,
        booking_date: TODAY_STR,
        queue_number: nextQueueNumber,
        status: "waiting",
        payment_status: "paid",
        ticket_code: ticketCode,
        source: "walk_in",
        is_priority: isPriority,
        checked_in_at: new Date().toISOString(),
        called_at: null,
        notified_near_at: null,
        qr_image_url: qrDataUrl,
        cancel_requested: false,
        created_at: new Date().toISOString(),
      };

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        patient_id: pat.id,
        booking_id: newBooking.id,
        amount: fee,
        payment_method: paymentMethod,
        receipt_image_url: null,
        type: "payment",
        created_at: new Date().toISOString(),
      };

      const nextBookings = [...bookings, newBooking];
      const nextTransactions = [newTransaction, ...transactions];

      setPatients(nextPatients);
      setBookings(nextBookings);
      setTransactions(nextTransactions);

      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages,
        receptionNotifications,
      });

      return newBooking;
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      lang,
      persistState,
    ]
  );

  const advanceDoctorQueue = useCallback(
    async (
      doctorId: string
    ): Promise<{ newQueueNumber: number; notifiedPatients: string[] }> => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) throw new Error("Doctor not found");

      const newQueueNumber = doctor.current_queue_number + 1;

      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              status:
                d.status === "not_arrived" ? ("available" as const) : d.status,
              current_queue_number: newQueueNumber,
              queue_date: TODAY_STR,
            }
          : d
      );

      const nextBookings = bookings.map((b) => {
        if (b.doctor_id !== doctorId) return b;
        if (b.status === "cancelled" || b.status === "no_show") return b;
        if (b.queue_number < newQueueNumber) {
          return { ...b, status: "completed" as const };
        }
        if (b.queue_number === newQueueNumber) {
          return {
            ...b,
            status: "in_progress" as const,
            called_at: new Date().toISOString(),
          };
        }
        return {
          ...b,
          status: "waiting" as const,
        };
      });

      const upcomingBookings = nextBookings
        .filter(
          (b) =>
            b.doctor_id === doctorId &&
            b.status !== "cancelled" &&
            b.status !== "no_show" &&
            b.queue_number >= newQueueNumber &&
            b.queue_number <= newQueueNumber + 3
        )
        .sort((a, b) => a.queue_number - b.queue_number);

      const autoMessages: ClinicMessage[] = [];
      const notifiedLabels: string[] = [];

      for (const b of upcomingBookings) {
        const pat = patients.find((p) => p.id === b.patient_id);
        const diff = b.queue_number - newQueueNumber;
        notifiedLabels.push(`#${b.queue_number} ${pat?.name || "Patient"}`);

        const tpl =
          diff === 0
            ? templates.yourTurn(doctor, b.queue_number)
            : templates.turnNear(doctor, b.queue_number, diff);

        autoMessages.push({
          id: crypto.randomUUID(),
          doctor_id: doctor.id,
          booking_id: b.id,
          patient_id: b.patient_id,
          kind: "automated",
          category: tpl.category,
          title_en: tpl.title_en,
          body_en: tpl.body_en,
          title_my: tpl.title_my,
          body_my: tpl.body_my,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        });

        if (currentPatient && currentPatient.id === b.patient_id) {
          showLocalNotification(
            lang === "my" ? tpl.title_my : tpl.title_en,
            lang === "my" ? tpl.body_my : tpl.body_en
          );
        }
      }

      const nextMessages = [...autoMessages, ...messages].slice(0, 60);

      setDoctors(nextDoctors);
      setBookings(nextBookings);
      setMessages(nextMessages);

      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
        receptionNotifications,
      });

      return {
        newQueueNumber,
        notifiedPatients: notifiedLabels,
      };
    },
    [
      doctors,
      bookings,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      currentPatient,
      lang,
      persistState,
    ]
  );

  const setCustomQueueNumber = useCallback(
    async (doctorId: string, queueNumber: number) => {
      const safeNum = Math.max(0, Math.floor(queueNumber));
      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? { ...d, current_queue_number: safeNum, queue_date: TODAY_STR }
          : d
      );

      const nextBookings = bookings.map((b) => {
        if (b.doctor_id !== doctorId) return b;
        if (b.status === "cancelled" || b.status === "no_show") return b;
        if (b.queue_number < safeNum) {
          return { ...b, status: "completed" as const };
        }
        if (b.queue_number === safeNum) {
          return {
            ...b,
            status: "in_progress" as const,
            called_at: new Date().toISOString(),
          };
        }
        return { ...b, status: "waiting" as const };
      });

      setDoctors(nextDoctors);
      setBookings(nextBookings);
      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const verifyReceiptAndConfirmBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      const doc = booking
        ? doctors.find((d) => d.id === booking.doctor_id)
        : null;

      const nextBookings = bookings.map((b) =>
        b.id === bookingId ? { ...b, payment_status: "paid" as const } : b
      );

      let nextMessages = [...messages];
      if (booking && doc) {
        const tpl = templates.paymentVerified(doc, booking.queue_number);
        nextMessages = [
          {
            id: crypto.randomUUID(),
            doctor_id: doc.id,
            booking_id: booking.id,
            patient_id: booking.patient_id,
            kind: "automated" as const,
            category: tpl.category,
            title_en: tpl.title_en,
            body_en: tpl.body_en,
            title_my: tpl.title_my,
            body_my: tpl.body_my,
            message_date: TODAY_STR,
            created_at: new Date().toISOString(),
          },
          ...messages,
        ].slice(0, 60);
      }

      const nextRecNotifs = receptionNotifications.map((n) =>
        n.booking_id === bookingId ? { ...n, is_read: true } : n
      );

      setBookings(nextBookings);
      setMessages(nextMessages);
      setReceptionNotifications(nextRecNotifs);

      persistState({
        settings,
        patients,
        doctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
        receptionNotifications: nextRecNotifs,
      });
    },
    [
      bookings,
      doctors,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  /**
   * Patient-initiated cancellation request:
   * - Strictly allowed ONLY when booking is "waiting" AND at least 2 patients are ahead
   *   (booking.queue_number - doctor.current_queue_number >= 2).
   * - Does NOT grant credit points until Reception confirms!
   */
  const requestPatientBookingCancel = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const doctor = doctors.find((d) => d.id === booking.doctor_id);
      const currentServing = doctor?.current_queue_number ?? 0;
      const patientsAhead = booking.queue_number - currentServing;

      if (booking.status !== "waiting" || patientsAhead < 2) {
        throw new Error(
          lang === "my"
            ? "သင့်အလှည့်ရောက်ရန် နီးကပ်နေပြီ (သို့မဟုတ် အလှည့်ကျော်သွားပြီ) ဖြစ်သဖြင့် ပယ်ဖျက်၍ မရနိုင်တော့ပါ။ အလှည့်မရောက်မီ အနည်းဆုံး လူနာ (၂) ဦး အလိုတွင်သာ ပယ်ဖျက်ခွင့်ရှိပါသည်။"
            : "Cancellation is only allowed when at least 2 patients are ahead of your turn."
        );
      }

      const pat = patients.find((p) => p.id === booking.patient_id);
      const tx = transactions.find(
        (t) => t.booking_id === booking.id && t.type === "payment"
      );

      const nextBookings = bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              cancel_requested: true,
              cancel_requested_at: new Date().toISOString(),
            }
          : b
      );

      const newCancelNotif: ReceptionNotification = {
        id: crypto.randomUUID(),
        type: "cancel_request",
        booking_id: booking.id,
        patient_id: booking.patient_id,
        patient_name: pat?.name || "Patient",
        patient_phone: pat?.phone || "",
        doctor_id: booking.doctor_id,
        doctor_name_my: doctor?.name_my || doctor?.name || "",
        doctor_name_en: doctor?.name || "",
        room_number: doctor?.room_number || "",
        queue_number: booking.queue_number,
        payment_method: tx?.payment_method || "kpay",
        is_read: false,
        created_at: new Date().toISOString(),
      };

      const reqMessage: ClinicMessage = {
        id: crypto.randomUUID(),
        doctor_id: booking.doctor_id,
        booking_id: booking.id,
        patient_id: booking.patient_id,
        kind: "automated",
        category: "info",
        title_my: "ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုချက် ပေးပို့ထားပါသည်",
        body_my:
          "သင်၏ ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုချက်ကို Reception သို့ ပေးပို့ထားပါသည်။ Reception မှ စစ်ဆေးအတည်ပြုပြီးမှသာ သင့်အကောင့်ထဲသို့ Credit Points ပြန်လည်ဝင်ရောက်ပါမည်။",
        title_en: "Cancellation Request Sent to Reception",
        body_en:
          "Your cancellation request has been sent to Reception. Credit Points will be credited to your account once Reception confirms.",
        message_date: TODAY_STR,
        created_at: new Date().toISOString(),
      };

      const nextMessages = [reqMessage, ...messages].slice(0, 60);
      const nextRecNotifs = [newCancelNotif, ...receptionNotifications].slice(
        0,
        40
      );

      setBookings(nextBookings);
      setMessages(nextMessages);
      setReceptionNotifications(nextRecNotifs);

      persistState({
        settings,
        patients,
        doctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
        receptionNotifications: nextRecNotifs,
      });
    },
    [
      bookings,
      doctors,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      lang,
      persistState,
    ]
  );

  /**
   * Reception-controlled cancellation & Credit Points confirmation.
   * Credit points ONLY enter the patient's account when Reception confirms with `grantCreditPoints: true`.
   */
  const cancelBookingAndRefund = useCallback(
    async (
      bookingId: string,
      options?: {
        grantCreditPoints?: boolean;
        rejectRequestOnly?: boolean;
      }
    ): Promise<{
      refundedAmount: number;
      patientName: string;
      action: "refunded" | "cancelled_no_credit" | "rejected";
    }> => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const doctor = doctors.find((d) => d.id === booking.doctor_id);
      const patient = patients.find((p) => p.id === booking.patient_id);
      const grantCreditPoints = options?.grantCreditPoints ?? true;
      const rejectRequestOnly = options?.rejectRequestOnly ?? false;

      // Case 1: Reception rejects patient's cancel request (booking stays in queue)
      if (rejectRequestOnly) {
        const nextBookings = bookings.map((b) =>
          b.id === bookingId
            ? { ...b, cancel_requested: false, cancel_requested_at: null }
            : b
        );
        const nextRecNotifs = receptionNotifications.map((n) =>
          n.booking_id === bookingId ? { ...n, is_read: true } : n
        );
        const rejectMsg: ClinicMessage = {
          id: crypto.randomUUID(),
          doctor_id: booking.doctor_id,
          booking_id: booking.id,
          patient_id: booking.patient_id,
          kind: "automated",
          category: "info",
          title_my: "ရက်ချိန်းပယ်ဖျက်ရန် တောင်းဆိုချက်ကို လက်မခံပါ",
          body_my: `သင်၏ အလှည့်နံပါတ် #${booking.queue_number} သည် ဆက်လက် အကျုံးဝင်နေပါသည်။ အသေးစိတ်သိရှိလိုပါက Reception ကောင်တာသို့ ဆက်သွယ်ပါ။`,
          title_en: "Cancellation Request Declined",
          body_en: `Your queue booking #${booking.queue_number} remains active. Please contact Reception for assistance.`,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        };
        const nextMessages = [rejectMsg, ...messages].slice(0, 60);

        setBookings(nextBookings);
        setMessages(nextMessages);
        setReceptionNotifications(nextRecNotifs);

        persistState({
          settings,
          patients,
          doctors,
          bookings: nextBookings,
          transactions,
          messages: nextMessages,
          receptionNotifications: nextRecNotifs,
        });

        return {
          refundedAmount: 0,
          patientName: patient?.name || "Patient",
          action: "rejected",
        };
      }

      // Case 2: Reception cancels booking (with or without Credit Points)
      const refundAmount = grantCreditPoints
        ? doctor?.consultation_fee || settings.defaultFee
        : 0;

      const nextBookings = bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              payment_status: grantCreditPoints
                ? ("refunded" as const)
                : ("void" as const),
              cancel_requested: false,
            }
          : b
      );

      const nextPatients = grantCreditPoints
        ? patients.map((p) =>
            p.id === booking.patient_id
              ? { ...p, credit_points: p.credit_points + refundAmount }
              : p
          )
        : patients;

      let nextTransactions = [...transactions];
      if (grantCreditPoints && refundAmount > 0) {
        const refundTransaction: Transaction = {
          id: crypto.randomUUID(),
          patient_id: booking.patient_id,
          booking_id: booking.id,
          amount: refundAmount,
          payment_method: "refund" as PaymentMethod,
          receipt_image_url: null,
          type: "refund",
          created_at: new Date().toISOString(),
        };
        nextTransactions = [refundTransaction, ...transactions];
      }

      let nextMessages = [...messages];
      if (doctor) {
        const tpl = templates.bookingCancelled(
          doctor,
          booking.queue_number,
          refundAmount
        );
        nextMessages = [
          {
            id: crypto.randomUUID(),
            doctor_id: doctor.id,
            booking_id: booking.id,
            patient_id: booking.patient_id,
            kind: "automated" as const,
            category: tpl.category,
            title_en: tpl.title_en,
            body_en: tpl.body_en,
            title_my: tpl.title_my,
            body_my: tpl.body_my,
            message_date: TODAY_STR,
            created_at: new Date().toISOString(),
          },
          ...messages,
        ].slice(0, 60);
      }

      const nextRecNotifs = receptionNotifications.map((n) =>
        n.booking_id === bookingId ? { ...n, is_read: true } : n
      );

      setBookings(nextBookings);
      setPatients(nextPatients);
      setTransactions(nextTransactions);
      setMessages(nextMessages);
      setReceptionNotifications(nextRecNotifs);

      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages: nextMessages,
        receptionNotifications: nextRecNotifs,
      });

      return {
        refundedAmount: refundAmount,
        patientName: patient?.name || "Patient",
        action: grantCreditPoints ? "refunded" : "cancelled_no_credit",
      };
    },
    [
      bookings,
      doctors,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const markReceptionNotificationRead = useCallback(
    async (notificationId: string) => {
      const nextRecNotifs = receptionNotifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      setReceptionNotifications(nextRecNotifs);
      persistState({
        settings,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications: nextRecNotifs,
      });
    },
    [
      receptionNotifications,
      settings,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      persistState,
    ]
  );

  const clearReceptionNotifications = useCallback(async () => {
    const nextRecNotifs = receptionNotifications.map((n) => ({
      ...n,
      is_read: true,
    }));
    setReceptionNotifications(nextRecNotifs);
    persistState({
      settings,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications: nextRecNotifs,
    });
  }, [
    receptionNotifications,
    settings,
    patients,
    doctors,
    bookings,
    transactions,
    messages,
    persistState,
  ]);

  const addDoctor = useCallback(
    async (input: DoctorFormInput): Promise<Doctor> => {
      const roomNum = input.room_number.trim() || "101";
      const specMy = input.specialty_my.trim() || input.specialty.trim();
      const specEn = input.specialty.trim() || input.specialty_my.trim();
      const autoCode =
        input.doctor_code?.trim() ||
        generateDoctorCode(`${specMy} ${specEn}`, roomNum, doctors.length + 1);

      const newDoc: Doctor = {
        id: crypto.randomUUID(),
        doctor_code: autoCode,
        name: input.name.trim() || input.name_my.trim(),
        name_my: input.name_my.trim() || input.name.trim(),
        specialty: specEn,
        specialty_my: specMy,
        room_number: roomNum,
        current_queue_number: 0,
        queue_date: TODAY_STR,
        consultation_fee:
          Number(input.consultation_fee) || settings.defaultFee,
        start_time: input.start_time.trim() || "အချိန်မရွေး",
        end_time: input.end_time.trim() || "",
        max_patients: input.max_patients || 30,
        avg_consult_minutes: input.avg_consult_minutes || 10,
        // Crucial: Adding a doctor does NOT automatically mark them as arrived/sitting!
        // They start as "not_arrived" with current_queue_number = 0 until Reception confirms arrival.
        status: "not_arrived",
        status_date: TODAY_STR,
        status_note: null,
        delay_minutes: 0,
        postponed_to: null,
        is_active: input.is_active ?? true,
        is_archived: false,
        sort_order: doctors.length + 1,
      };

      const nextDoctors = [...doctors, newDoc];
      setDoctors(nextDoctors);
      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
      return newDoc;
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const updateDoctor = useCallback(
    async (doctorId: string, input: Partial<DoctorFormInput>) => {
      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              ...input,
              doctor_code:
                input.doctor_code?.trim() ||
                d.doctor_code ||
                generateDoctorCode(
                  `${input.specialty_my || d.specialty_my} ${
                    input.specialty || d.specialty
                  }`,
                  input.room_number || d.room_number
                ),
              consultation_fee:
                input.consultation_fee !== undefined
                  ? Number(input.consultation_fee)
                  : d.consultation_fee,
            }
          : d
      );
      setDoctors(nextDoctors);
      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  /**
   * Removes a doctor from today's active schedule while keeping them saved
   * in the clinic's doctor directory (`is_archived: true`) so Reception can
   * easily re-select them in the future by Name, Specialty & Code.
   */
  const removeDoctor = useCallback(
    async (doctorId: string) => {
      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              is_archived: true,
              is_active: false,
              status: "not_arrived" as const,
              current_queue_number: 0,
            }
          : d
      );
      setDoctors(nextDoctors);
      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  /**
   * Re-activates a previously saved doctor onto today's schedule.
   * Starts in "not_arrived" status with current_queue_number = 0 until Reception marks them arrived.
   */
  const activateSavedDoctorForToday = useCallback(
    async (
      doctorId: string,
      overrides?: Partial<DoctorFormInput>
    ): Promise<Doctor | null> => {
      let updatedDoc: Doctor | null = null;
      const nextDoctors = doctors.map((d) => {
        if (d.id !== doctorId) return d;
        const roomNum = overrides?.room_number?.trim() || d.room_number;
        const specMy =
          overrides?.specialty_my?.trim() || d.specialty_my || d.specialty;
        const specEn =
          overrides?.specialty?.trim() || d.specialty || d.specialty_my || "";
        updatedDoc = {
          ...d,
          doctor_code:
            overrides?.doctor_code?.trim() ||
            d.doctor_code ||
            generateDoctorCode(`${specMy} ${specEn}`, roomNum),
          name: overrides?.name?.trim() || d.name,
          name_my: overrides?.name_my?.trim() || d.name_my,
          specialty: specEn,
          specialty_my: specMy,
          room_number: roomNum,
          consultation_fee:
            overrides?.consultation_fee !== undefined
              ? Number(overrides.consultation_fee)
              : d.consultation_fee,
          start_time:
            overrides?.start_time !== undefined
              ? overrides.start_time.trim()
              : d.start_time,
          end_time:
            overrides?.end_time !== undefined
              ? overrides.end_time.trim()
              : d.end_time,
          is_archived: false,
          is_active: true,
          status: "not_arrived",
          current_queue_number: 0,
          queue_date: TODAY_STR,
          delay_minutes: 0,
          postponed_to: null,
          status_note: null,
        };
        return updatedDoc;
      });

      setDoctors(nextDoctors);
      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
      return updatedDoc;
    },
    [
      doctors,
      patients,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  /**
   * Reception confirms the doctor has arrived at the clinic:
   * - Sets doctor.status = "available"
   * - Starts queue at #1 (or keeps current_queue_number if already >= 1)
   * - Marks booking #1 as "in_progress" and broadcasts arrival + turn #1 alerts
   */
  const markDoctorArrivedAndStartQueue = useCallback(
    async (doctorId: string): Promise<{ newQueueNumber: number }> => {
      const doc = doctors.find((d) => d.id === doctorId);
      if (!doc) return { newQueueNumber: 1 };

      const startQueueNum =
        doc.current_queue_number > 0 ? doc.current_queue_number : 1;

      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              status: "available" as const,
              status_date: TODAY_STR,
              current_queue_number: startQueueNum,
              queue_date: TODAY_STR,
              delay_minutes: 0,
              postponed_to: null,
            }
          : d
      );

      const nextBookings = bookings.map((b) => {
        if (b.doctor_id !== doctorId) return b;
        if (b.status === "cancelled" || b.status === "no_show") return b;
        if (b.queue_number < startQueueNum) {
          return { ...b, status: "completed" as const };
        }
        if (b.queue_number === startQueueNum) {
          return {
            ...b,
            status: "in_progress" as const,
            called_at: new Date().toISOString(),
          };
        }
        return { ...b, status: "waiting" as const };
      });

      const arrivalTpl = templates.available(doc);
      const newAutoMessages: ClinicMessage[] = [
        {
          id: crypto.randomUUID(),
          doctor_id: doc.id,
          booking_id: null,
          patient_id: null,
          kind: "automated",
          category: arrivalTpl.category,
          title_en: `${arrivalTpl.title_en} (Now Serving #${startQueueNum})`,
          body_en: `${arrivalTpl.body_en} Queue #${startQueueNum} is now being called.`,
          title_my: `${arrivalTpl.title_my} (အလှည့်နံပါတ် #${startQueueNum} စတင်ပြသနေပါပြီ)`,
          body_my: `${arrivalTpl.body_my} အလှည့်နံပါတ် #${startQueueNum} မှစတင်၍ အခန်း (${doc.room_number}) သို့ ဝင်ရောက်ပြသနိုင်ပါပြီ။`,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        },
      ];

      const nextMessages = [...newAutoMessages, ...messages].slice(0, 60);

      setDoctors(nextDoctors);
      setBookings(nextBookings);
      setMessages(nextMessages);

      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
        receptionNotifications,
      });

      return { newQueueNumber: startQueueNum };
    },
    [
      doctors,
      bookings,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const updateDoctorSessionStatus = useCallback(
    async (
      doctorId: string,
      {
        status,
        delayMinutes = 0,
        postponedTo = null,
        note = null,
      }: {
        status: DoctorStatus;
        delayMinutes?: number;
        postponedTo?: string | null;
        note?: string | null;
      }
    ) => {
      const doc = doctors.find((d) => d.id === doctorId);
      if (!doc) return;

      const nextQueueNum =
        status === "available" && doc.current_queue_number === 0
          ? 1
          : status === "not_arrived"
          ? 0
          : doc.current_queue_number;

      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              status,
              status_date: TODAY_STR,
              current_queue_number: nextQueueNum,
              delay_minutes: status === "delayed" ? delayMinutes : 0,
              postponed_to: status === "postponed" ? postponedTo : null,
              status_note: note,
            }
          : d
      );

      let nextBookings = [...bookings];
      const newAutoMessages: ClinicMessage[] = [];

      if (status === "delayed") {
        const tpl = templates.delay(doc, delayMinutes || 30, note);
        newAutoMessages.push({
          id: crypto.randomUUID(),
          doctor_id: doc.id,
          booking_id: null,
          patient_id: null,
          kind: "automated",
          category: tpl.category,
          title_en: tpl.title_en,
          body_en: tpl.body_en,
          title_my: tpl.title_my,
          body_my: tpl.body_my,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        });
      } else if (status === "postponed" && postponedTo) {
        nextBookings = bookings.map((b) =>
          b.doctor_id === doctorId && b.status === "waiting"
            ? { ...b, booking_date: postponedTo }
            : b
        );
        const tpl = templates.postponed(doc, postponedTo, 1, note);
        newAutoMessages.push({
          id: crypto.randomUUID(),
          doctor_id: doc.id,
          booking_id: null,
          patient_id: null,
          kind: "automated",
          category: tpl.category,
          title_en: tpl.title_en,
          body_en: tpl.body_en,
          title_my: tpl.title_my,
          body_my: tpl.body_my,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        });
      } else if (status === "available") {
        const tpl = templates.available(doc);
        newAutoMessages.push({
          id: crypto.randomUUID(),
          doctor_id: doc.id,
          booking_id: null,
          patient_id: null,
          kind: "automated",
          category: tpl.category,
          title_en: tpl.title_en,
          body_en: tpl.body_en,
          title_my: tpl.title_my,
          body_my: tpl.body_my,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        });
      } else if (status === "off") {
        const tpl = templates.sessionCancelled(doc, doc.consultation_fee, note);
        newAutoMessages.push({
          id: crypto.randomUUID(),
          doctor_id: doc.id,
          booking_id: null,
          patient_id: null,
          kind: "automated",
          category: tpl.category,
          title_en: tpl.title_en,
          body_en: tpl.body_en,
          title_my: tpl.title_my,
          body_my: tpl.body_my,
          message_date: TODAY_STR,
          created_at: new Date().toISOString(),
        });
      }

      const nextMessages = [...newAutoMessages, ...messages].slice(0, 60);

      setDoctors(nextDoctors);
      setBookings(nextBookings);
      setMessages(nextMessages);

      persistState({
        settings,
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
        receptionNotifications,
      });
    },
    [
      doctors,
      bookings,
      patients,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const sendClinicMessage = useCallback(
    async ({
      doctorId = null,
      bookingId = null,
      patientId = null,
      titleMy,
      bodyMy,
      titleEn,
      bodyEn,
      kind = "manual",
    }: {
      doctorId?: string | null;
      bookingId?: string | null;
      patientId?: string | null;
      titleMy: string;
      bodyMy: string;
      titleEn?: string;
      bodyEn?: string;
      kind?: "manual" | "automated";
    }): Promise<ClinicMessage> => {
      const msg: ClinicMessage = {
        id: crypto.randomUUID(),
        doctor_id: doctorId,
        booking_id: bookingId,
        patient_id: patientId,
        kind,
        category: "info",
        title_my: titleMy.trim() || titleEn?.trim() || "ဆေးခန်း အသိပေးချက်",
        body_my: bodyMy.trim() || bodyEn?.trim() || "",
        title_en: titleEn?.trim() || titleMy.trim() || "Clinic Notice",
        body_en: bodyEn?.trim() || bodyMy.trim() || "",
        message_date: TODAY_STR,
        created_at: new Date().toISOString(),
      };

      const nextMessages = [msg, ...messages].slice(0, 60);
      setMessages(nextMessages);

      persistState({
        settings,
        patients,
        doctors,
        bookings,
        transactions,
        messages: nextMessages,
        receptionNotifications,
      });

      return msg;
    },
    [
      messages,
      patients,
      doctors,
      bookings,
      transactions,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const addDemoCreditPoints = useCallback(
    async (amount: number) => {
      if (!currentPatient) return;
      const nextPatients = patients.map((p) =>
        p.id === currentPatient.id
          ? { ...p, credit_points: p.credit_points + amount }
          : p
      );
      setPatients(nextPatients);
      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      currentPatient,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      settings,
      persistState,
    ]
  );

  const updateClinicSettings = useCallback(
    async (partial: Partial<ClinicSettings>) => {
      const nextSettings: ClinicSettings = {
        ...settings,
        ...partial,
        paymentAccounts: {
          ...settings.paymentAccounts,
          ...(partial.paymentAccounts || {}),
        },
      };
      setSettings(nextSettings);
      persistState({
        settings: nextSettings,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      settings,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      persistState,
    ]
  );

  const updateReceptionPin = useCallback(
    async (currentPin: string, newPin: string): Promise<boolean> => {
      if (currentPin.trim() !== settings.receptionPin) {
        return false;
      }
      if (!newPin.trim() || newPin.trim().length < 4) {
        return false;
      }
      const nextSettings: ClinicSettings = {
        ...settings,
        receptionPin: newPin.trim(),
      };
      setSettings(nextSettings);
      persistState({
        settings: nextSettings,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
      return true;
    },
    [
      settings,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      persistState,
    ]
  );

  const updateSuperAdminPin = useCallback(
    async (currentPin: string, newPin: string): Promise<boolean> => {
      if (currentPin.trim() !== settings.superAdminPin) {
        return false;
      }
      if (!newPin.trim() || newPin.trim().length < 4) {
        return false;
      }
      const nextSettings: ClinicSettings = {
        ...settings,
        superAdminPin: newPin.trim(),
      };
      setSettings(nextSettings);
      persistState({
        settings: nextSettings,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
      return true;
    },
    [
      settings,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      persistState,
    ]
  );

  const adjustPatientCredits = useCallback(
    async (patientId: string, newCreditPoints: number) => {
      const safeCredits = Math.max(0, Math.floor(newCreditPoints));
      const nextPatients = patients.map((p) =>
        p.id === patientId ? { ...p, credit_points: safeCredits } : p
      );
      setPatients(nextPatients);
      persistState({
        settings,
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
      });
    },
    [
      patients,
      settings,
      doctors,
      bookings,
      transactions,
      messages,
      receptionNotifications,
      persistState,
    ]
  );

  const resetDemoData = useCallback(async () => {
    setDoctors(INITIAL_DOCTORS);
    setPatients(INITIAL_PATIENTS);
    setBookings(INITIAL_BOOKINGS);
    setTransactions(INITIAL_TRANSACTIONS);
    setMessages(INITIAL_MESSAGES);
    setReceptionNotifications([]);
    persistState({
      settings,
      patients: INITIAL_PATIENTS,
      doctors: INITIAL_DOCTORS,
      bookings: INITIAL_BOOKINGS,
      transactions: INITIAL_TRANSACTIONS,
      messages: INITIAL_MESSAGES,
      receptionNotifications: [],
    });
  }, [settings, persistState]);

  return (
    <ClinicContext.Provider
      value={{
        lang,
        setLang,
        viewport,
        settings,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        receptionNotifications,
        currentPatient,
        isLoading,
        isRealtimeConnected,
        loginWithPhoneOtp,
        loginOrRegisterPatient,
        updatePatientPhoneByReception,
        logoutPatient,
        createBooking,
        createWalkInBooking,
        advanceDoctorQueue,
        setCustomQueueNumber,
        verifyReceiptAndConfirmBooking,
        requestPatientBookingCancel,
        cancelBookingAndRefund,
        markReceptionNotificationRead,
        clearReceptionNotifications,
        addDoctor,
        updateDoctor,
        removeDoctor,
        activateSavedDoctorForToday,
        markDoctorArrivedAndStartQueue,
        updateDoctorSessionStatus,
        sendClinicMessage,
        addDemoCreditPoints,
        updateClinicSettings,
        updateReceptionPin,
        updateSuperAdminPin,
        adjustPatientCredits,
        resetDemoData,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) {
    throw new Error("useClinic must be used within a ClinicProvider");
  }
  return ctx;
}
