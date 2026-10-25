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
} from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { showLocalNotification } from "@/lib/firebase";
import { CLINIC_CONFIG, DEFAULT_LANGUAGE } from "@/clinic.config";
import { clinicToday } from "@/lib/date";
import { templates } from "@/lib/messages";

const STORAGE_KEY = "auracare_clinic_state_v2";
const PATIENT_SESSION_KEY = "auracare_current_patient_id_v2";
const LANG_STORAGE_KEY = "auracare_lang_v2";
const CHANNEL_NAME = "auracare_realtime_channel_v2";

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
  <text x="424" y="455" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">09-777-888-999</text>
  <text x="56" y="505" fill="#475569" font-family="sans-serif" font-size="16">Purpose</text>
  <text x="424" y="505" text-anchor="end" fill="#0F172A" font-family="sans-serif" font-size="16" font-weight="bold">Clinic Queue Booking</text>
</svg>
`)}`;

const TODAY_STR = clinicToday();

const INITIAL_DOCTORS: Doctor[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
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
    name: "Dr. Zaw Min Tun",
    name_my: "ဒေါက်တာ ဇော်မင်းထွန်း",
    specialty: "Orthopedic, Bone & Joint Specialist",
    specialty_my: "အရိုး၊ အကြောနှင့် အဆစ်အမြစ် အထူးကုဆရာဝန်ကြီး",
    room_number: "105",
    current_queue_number: 1,
    queue_date: TODAY_STR,
    consultation_fee: 20000,
    start_time: "13:00",
    end_time: "16:00",
    max_patients: 25,
    avg_consult_minutes: 12,
    status: "available",
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
    name: "Dr. Khin Myat Noe",
    name_my: "ဒေါက်တာ ခင်မြတ်နိုး",
    specialty: "Eye & Cataract Specialist (Ophthalmology)",
    specialty_my: "မျက်စိနှင့် အတွင်းတိမ် အထူးကုဆရာဝန်ကြီး",
    room_number: "201",
    current_queue_number: 2,
    queue_date: TODAY_STR,
    consultation_fee: 20000,
    start_time: "14:00",
    end_time: "17:00",
    max_patients: 25,
    avg_consult_minutes: 10,
    status: "available",
    status_date: TODAY_STR,
    status_note: null,
    delay_minutes: 0,
    postponed_to: null,
    is_active: true,
    is_archived: false,
    sort_order: 4,
  },
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: "22222222-2222-4222-8222-222222222201",
    phone: "095123456",
    name: "ဦးဘလှိုင် (U Ba Hlaing)",
    credit_points: 30000,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222202",
    phone: "0942001122",
    name: "ဒေါ်မြစိန် (Daw Mya Sein)",
    credit_points: 15000,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222203",
    phone: "0979887766",
    name: "ဦးတင်ဦး (U Tin Oo)",
    credit_points: 0,
    fcm_token: null,
    preferred_language: "my",
  },
  {
    id: "22222222-2222-4222-8222-222222222204",
    phone: "0997112233",
    name: "ဒေါ်ခင်စော (Daw Khin Saw)",
    credit_points: 45000,
    fcm_token: null,
    preferred_language: "my",
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: "33333333-3333-4333-8333-333333333301",
    patient_id: "22222222-2222-4222-8222-222222222202",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_date: TODAY_STR,
    queue_number: 3,
    status: "in_progress",
    payment_status: "paid",
    ticket_code: "AC-103",
    source: "online",
    is_priority: false,
    checked_in_at: new Date(Date.now() - 40 * 60000).toISOString(),
    called_at: new Date(Date.now() - 5 * 60000).toISOString(),
    notified_near_at: new Date(Date.now() - 20 * 60000).toISOString(),
    qr_image_url: null,
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
    ticket_code: "AC-104",
    source: "online",
    is_priority: false,
    checked_in_at: null,
    called_at: null,
    notified_near_at: null,
    qr_image_url: null,
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
    ticket_code: "AC-105",
    source: "online",
    is_priority: false,
    checked_in_at: null,
    called_at: null,
    notified_near_at: null,
    qr_image_url: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
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

const INITIAL_MESSAGES: ClinicMessage[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    doctor_id: "11111111-1111-4111-8111-111111111101",
    booking_id: null,
    patient_id: null,
    kind: "automated",
    category: "available",
    title_en: "Doctor has arrived",
    body_en: "Dr. Aung Kyaw Moe has arrived and is now seeing patients in Room 101.",
    title_my: "ဆရာဝန်ကြီး ရောက်ရှိပါပြီ",
    body_my: "ဒေါက်တာ အောင်ကျော်မိုး ရောက်ရှိပြီး အခန်း ၁၀၁ တွင် လူနာများကို စတင် ကြည့်ရှုနေပါပြီ။",
    message_date: TODAY_STR,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
];

interface LocalPersistedState {
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  messages: ClinicMessage[];
}

export interface DoctorFormInput {
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
  patients: Patient[];
  doctors: Doctor[];
  bookings: Booking[];
  transactions: Transaction[];
  messages: ClinicMessage[];
  currentPatient: Patient | null;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  loginWithPhoneOtp: (phone: string, name?: string) => Promise<Patient>;
  logoutPatient: () => void;
  createBooking: (params: {
    doctorId: string;
    paymentMethod: "kpay" | "wavepay" | "ayapay" | "credit_points";
    receiptFile?: File | null;
  }) => Promise<Booking>;
  createWalkInBooking: (params: {
    doctorId: string;
    patientName: string;
    patientPhone: string;
    isPriority: boolean;
    paymentMethod: "cash" | "kpay" | "wavepay" | "ayapay";
  }) => Promise<Booking>;
  advanceDoctorQueue: (doctorId: string) => Promise<{
    newQueueNumber: number;
    notifiedPatients: string[];
  }>;
  setCustomQueueNumber: (doctorId: string, queueNumber: number) => Promise<void>;
  verifyReceiptAndConfirmBooking: (bookingId: string) => Promise<void>;
  cancelBookingAndRefund: (bookingId: string) => Promise<{
    refundedAmount: number;
    patientName: string;
  }>;
  addDoctor: (input: DoctorFormInput) => Promise<Doctor>;
  updateDoctor: (doctorId: string, input: Partial<DoctorFormInput>) => Promise<void>;
  removeDoctor: (doctorId: string) => Promise<void>;
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
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

async function uploadImageToCloudinaryOrDataUrl(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (
    cloudName &&
    uploadPreset &&
    !cloudName.includes("your-cloudinary") &&
    !uploadPreset.includes("your-unsigned")
  ) {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", uploadPreset);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: form }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) return json.secure_url as string;
      }
    } catch {
      // Fall back to Data URL
    }
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
  ticketCode: string
): Promise<string> {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const ticketUrl = `${origin}/ticket/${bookingId}?code=${ticketCode}`;
  return QRCode.toDataURL(ticketUrl, {
    width: 360,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANGUAGE);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [messages, setMessages] = useState<ClinicMessage[]>(INITIAL_MESSAGES);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);

  const broadcastRef = useRef<BroadcastChannel | null>(null);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    }
  }, []);

  const persistState = useCallback((next: LocalPersistedState) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      broadcastRef.current?.postMessage({
        type: "SYNC_STATE",
        payload: next,
      });
    } catch {
      // Ignore quota errors
    }
  }, []);

  const fetchSupabaseData = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return;
    try {
      const [{ data: docs, error: dErr }, { data: bks }, { data: msgs }] =
        await Promise.all([
          supabase
            .from("doctors")
            .select("*")
            .eq("is_archived", false)
            .order("sort_order"),
          supabase
            .from("bookings")
            .select("*")
            .gte("booking_date", TODAY_STR)
            .order("queue_number", { ascending: true }),
          supabase
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (!dErr && docs && docs.length > 0) {
        setDoctors(
          docs.map((d) => ({
            ...INITIAL_DOCTORS[0],
            ...d,
            consultation_fee:
              Number(d.consultation_fee) || CLINIC_CONFIG.defaultConsultationFee,
            current_queue_number: Number(d.current_queue_number) || 0,
          }))
        );
      }
      if (bks && bks.length > 0) setBookings(bks as Booking[]);
      if (msgs && msgs.length > 0) setMessages(msgs as ClinicMessage[]);
    } catch {
      // Keep local state if Supabase schema isn't migrated yet
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLang = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    if (savedLang === "my" || savedLang === "en") {
      setLangState(savedLang);
    }

    const savedStateRaw = localStorage.getItem(STORAGE_KEY);
    if (savedStateRaw) {
      try {
        const parsed = JSON.parse(savedStateRaw) as LocalPersistedState;
        if (parsed.doctors?.length) setDoctors(parsed.doctors);
        if (parsed.patients?.length) setPatients(parsed.patients);
        if (parsed.bookings) setBookings(parsed.bookings);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.messages) setMessages(parsed.messages);
      } catch {
        // Ignore invalid storage
      }
    } else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          patients: INITIAL_PATIENTS,
          doctors: INITIAL_DOCTORS,
          bookings: INITIAL_BOOKINGS,
          transactions: INITIAL_TRANSACTIONS,
          messages: INITIAL_MESSAGES,
        })
      );
    }

    const savedPatientId = localStorage.getItem(PATIENT_SESSION_KEY);
    if (savedPatientId) {
      setCurrentPatientId(savedPatientId);
    }

    setIsLoading(false);

    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "SYNC_STATE" && event.data?.payload) {
          const p = event.data.payload as LocalPersistedState;
          setDoctors(p.doctors);
          setPatients(p.patients);
          setBookings(p.bookings);
          setTransactions(p.transactions);
          setMessages(p.messages || []);
        }
      };
      broadcastRef.current = bc;
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const p = JSON.parse(e.newValue) as LocalPersistedState;
          setDoctors(p.doctors);
          setPatients(p.patients);
          setBookings(p.bookings);
          setTransactions(p.transactions);
          setMessages(p.messages || []);
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    let supabaseChannel: ReturnType<
      NonNullable<typeof supabase>["channel"]
    > | null = null;

    if (supabase && isSupabaseConfigured) {
      fetchSupabaseData();
      supabaseChannel = supabase
        .channel("clinic-realtime-v2")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "doctors" },
          () => fetchSupabaseData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings" },
          () => fetchSupabaseData()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          () => fetchSupabaseData()
        )
        .subscribe((status) => {
          setIsRealtimeConnected(status === "SUBSCRIBED" || true);
        });
    }

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      broadcastRef.current?.close();
      if (supabase && supabaseChannel) {
        supabase.removeChannel(supabaseChannel);
      }
    };
  }, [fetchSupabaseData]);

  const currentPatient =
    patients.find((p) => p.id === currentPatientId) || null;

  const loginWithPhoneOtp = useCallback(
    async (phone: string, name?: string): Promise<Patient> => {
      const normalizedPhone = phone.replace(/\D/g, "");
      let matched = patients.find(
        (p) => p.phone.replace(/\D/g, "") === normalizedPhone
      );

      let nextPatients: Patient[];
      if (matched) {
        matched = {
          ...matched,
          name: name?.trim() ? name.trim() : matched.name,
          preferred_language: lang,
        };
        nextPatients = patients.map((p) =>
          p.id === matched!.id ? matched! : p
        );
      } else {
        matched = {
          id: crypto.randomUUID(),
          phone: normalizedPhone,
          name: name?.trim() || `လူနာ (${normalizedPhone.slice(-4)})`,
          credit_points: 30000,
          fcm_token: null,
          preferred_language: lang,
          created_at: new Date().toISOString(),
        };
        nextPatients = [...patients, matched];
      }

      if (supabase && isSupabaseConfigured) {
        try {
          await supabase.from("patients").upsert({
            id: matched.id,
            phone: matched.phone,
            name: matched.name,
            credit_points: matched.credit_points,
            preferred_language: matched.preferred_language,
          });
        } catch {
          // Fallback to local state
        }
      }

      setPatients(nextPatients);
      setCurrentPatientId(matched.id);
      localStorage.setItem(PATIENT_SESSION_KEY, matched.id);

      persistState({
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages,
      });

      return matched;
    },
    [patients, doctors, bookings, transactions, messages, lang, persistState]
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

      const fee = doctor.consultation_fee || CLINIC_CONFIG.defaultConsultationFee;

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
        if (receiptFile) {
          receiptImageUrl = await uploadImageToCloudinaryOrDataUrl(receiptFile);
        } else {
          receiptImageUrl = SAMPLE_RECEIPT_SVG;
        }
      }

      const doctorBookingsToday = bookings.filter(
        (b) => b.doctor_id === doctorId && b.booking_date === TODAY_STR
      );
      const highestBookedQueue = doctorBookingsToday.reduce(
        (max, b) => Math.max(max, b.queue_number),
        doctor.current_queue_number
      );
      const nextQueueNumber = highestBookedQueue + 1;
      const isInstantPaid = paymentMethod === "credit_points";
      const bookingId = crypto.randomUUID();
      const ticketCode = `AC-${doctor.room_number}-${nextQueueNumber}`;
      const qrDataUrl = await generateTicketQrDataUrl(bookingId, ticketCode);

      const newBooking: Booking = {
        id: bookingId,
        patient_id: currentPatient.id,
        doctor_id: doctorId,
        booking_date: TODAY_STR,
        queue_number: nextQueueNumber,
        status: "waiting",
        payment_status: isInstantPaid ? "paid" : "pending",
        ticket_code: ticketCode,
        source: "online",
        is_priority: false,
        checked_in_at: null,
        called_at: null,
        notified_near_at: null,
        qr_image_url: qrDataUrl,
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

      if (supabase && isSupabaseConfigured) {
        try {
          await supabase.from("bookings").insert(newBooking);
          await supabase.from("transactions").insert(newTransaction);
        } catch {
          // Local fallback
        }
      }

      const nextPatients = isInstantPaid
        ? patients.map((p) =>
            p.id === currentPatient.id
              ? { ...p, credit_points: Math.max(0, p.credit_points - fee) }
              : p
          )
        : patients;

      const nextBookings = [...bookings, newBooking];
      const nextTransactions = [newTransaction, ...transactions];

      setPatients(nextPatients);
      setBookings(nextBookings);
      setTransactions(nextTransactions);

      persistState({
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages,
      });

      return newBooking;
    },
    [
      currentPatient,
      doctors,
      bookings,
      patients,
      transactions,
      messages,
      lang,
      persistState,
    ]
  );

  const createWalkInBooking = useCallback(
    async ({
      doctorId,
      patientName,
      patientPhone,
      isPriority,
      paymentMethod,
    }: {
      doctorId: string;
      patientName: string;
      patientPhone: string;
      isPriority: boolean;
      paymentMethod: "cash" | "kpay" | "wavepay" | "ayapay";
    }): Promise<Booking> => {
      const doctor = doctors.find((d) => d.id === doctorId);
      if (!doctor) throw new Error("Doctor not found");

      const cleanedPhone =
        patientPhone.replace(/\D/g, "") ||
        `09${Math.floor(100000000 + Math.random() * 900000000)}`;
      let pat = patients.find(
        (p) => p.phone.replace(/\D/g, "") === cleanedPhone
      );
      let nextPatients = [...patients];

      if (!pat) {
        pat = {
          id: crypto.randomUUID(),
          phone: cleanedPhone,
          name: patientName.trim() || `Walk-in (${cleanedPhone.slice(-4)})`,
          credit_points: 0,
          fcm_token: null,
          preferred_language: "my",
          created_at: new Date().toISOString(),
        };
        nextPatients.push(pat);
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
      const ticketCode = `${isPriority ? "VIP" : "WK"}-${doctor.room_number}-${nextQueueNumber}`;
      const qrDataUrl = await generateTicketQrDataUrl(bookingId, ticketCode);

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
        created_at: new Date().toISOString(),
      };

      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        patient_id: pat.id,
        booking_id: newBooking.id,
        amount: doctor.consultation_fee,
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
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages,
      });

      return newBooking;
    },
    [doctors, patients, bookings, transactions, messages, persistState]
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
              current_queue_number: newQueueNumber,
              queue_date: TODAY_STR,
            }
          : d
      );

      const nextBookings = bookings.map((b) => {
        if (b.doctor_id !== doctorId || b.booking_date !== TODAY_STR) return b;
        if (b.status === "cancelled") return b;
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
        return b;
      });

      // Automated messages for called patient & next 3 patients
      const upcomingBookings = nextBookings
        .filter(
          (b) =>
            b.doctor_id === doctorId &&
            b.booking_date === TODAY_STR &&
            b.status !== "cancelled" &&
            b.queue_number >= newQueueNumber &&
            b.queue_number <= newQueueNumber + 3
        )
        .sort((a, b) => a.queue_number - b.queue_number);

      const autoMessages: ClinicMessage[] = [];
      const notifiedLabels: string[] = [];

      for (const b of upcomingBookings) {
        const pat = patients.find((p) => p.id === b.patient_id);
        const diff = b.queue_number - newQueueNumber;
        notifiedLabels.push(
          `#${b.queue_number} ${pat?.name || "Patient"}`
        );

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
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
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
      setDoctors(nextDoctors);
      persistState({
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
      });
    },
    [doctors, patients, bookings, transactions, messages, persistState]
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

      setBookings(nextBookings);
      setMessages(nextMessages);

      persistState({
        patients,
        doctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
      });
    },
    [bookings, doctors, patients, transactions, messages, persistState]
  );

  const cancelBookingAndRefund = useCallback(
    async (
      bookingId: string
    ): Promise<{ refundedAmount: number; patientName: string }> => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");

      const doctor = doctors.find((d) => d.id === booking.doctor_id);
      const refundAmount =
        doctor?.consultation_fee || CLINIC_CONFIG.defaultConsultationFee;
      const patient = patients.find((p) => p.id === booking.patient_id);

      const nextBookings = bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              payment_status: "refunded" as const,
            }
          : b
      );

      const nextPatients = patients.map((p) =>
        p.id === booking.patient_id
          ? { ...p, credit_points: p.credit_points + refundAmount }
          : p
      );

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

      const nextTransactions = [refundTransaction, ...transactions];

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

      setBookings(nextBookings);
      setPatients(nextPatients);
      setTransactions(nextTransactions);
      setMessages(nextMessages);

      persistState({
        patients: nextPatients,
        doctors,
        bookings: nextBookings,
        transactions: nextTransactions,
        messages: nextMessages,
      });

      return {
        refundedAmount: refundAmount,
        patientName: patient?.name || "Patient",
      };
    },
    [bookings, doctors, patients, transactions, messages, persistState]
  );

  const addDoctor = useCallback(
    async (input: DoctorFormInput): Promise<Doctor> => {
      const newDoc: Doctor = {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        name_my: input.name_my.trim() || input.name.trim(),
        specialty: input.specialty.trim(),
        specialty_my: input.specialty_my.trim() || input.specialty.trim(),
        room_number: input.room_number.trim() || "101",
        current_queue_number: 0,
        queue_date: TODAY_STR,
        consultation_fee:
          Number(input.consultation_fee) || CLINIC_CONFIG.defaultConsultationFee,
        start_time: input.start_time || "09:00",
        end_time: input.end_time || "12:00",
        max_patients: input.max_patients || 30,
        avg_consult_minutes: input.avg_consult_minutes || 10,
        status: "available",
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
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
      });
      return newDoc;
    },
    [doctors, patients, bookings, transactions, messages, persistState]
  );

  const updateDoctor = useCallback(
    async (doctorId: string, input: Partial<DoctorFormInput>) => {
      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              ...input,
              consultation_fee:
                input.consultation_fee !== undefined
                  ? Number(input.consultation_fee)
                  : d.consultation_fee,
            }
          : d
      );
      setDoctors(nextDoctors);
      persistState({
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
      });
    },
    [doctors, patients, bookings, transactions, messages, persistState]
  );

  const removeDoctor = useCallback(
    async (doctorId: string) => {
      const nextDoctors = doctors.filter((d) => d.id !== doctorId);
      setDoctors(nextDoctors);
      persistState({
        patients,
        doctors: nextDoctors,
        bookings,
        transactions,
        messages,
      });
    },
    [doctors, patients, bookings, transactions, messages, persistState]
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

      const nextDoctors = doctors.map((d) =>
        d.id === doctorId
          ? {
              ...d,
              status,
              status_date: TODAY_STR,
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
          b.doctor_id === doctorId &&
          b.booking_date === TODAY_STR &&
          b.status === "waiting"
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
        patients,
        doctors: nextDoctors,
        bookings: nextBookings,
        transactions,
        messages: nextMessages,
      });
    },
    [doctors, bookings, patients, transactions, messages, persistState]
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
        patients,
        doctors,
        bookings,
        transactions,
        messages: nextMessages,
      });

      return msg;
    },
    [messages, patients, doctors, bookings, transactions, persistState]
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
        patients: nextPatients,
        doctors,
        bookings,
        transactions,
        messages,
      });
    },
    [
      currentPatient,
      patients,
      doctors,
      bookings,
      transactions,
      messages,
      persistState,
    ]
  );

  return (
    <ClinicContext.Provider
      value={{
        lang,
        setLang,
        patients,
        doctors,
        bookings,
        transactions,
        messages,
        currentPatient,
        isLoading,
        isRealtimeConnected,
        loginWithPhoneOtp,
        logoutPatient,
        createBooking,
        createWalkInBooking,
        advanceDoctorQueue,
        setCustomQueueNumber,
        verifyReceiptAndConfirmBooking,
        cancelBookingAndRefund,
        addDoctor,
        updateDoctor,
        removeDoctor,
        updateDoctorSessionStatus,
        sendClinicMessage,
        addDemoCreditPoints,
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
