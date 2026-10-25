export type Lang = "my" | "en";

export type DoctorStatus =
  | "not_arrived"
  | "available"
  | "delayed"
  | "postponed"
  | "off";
export type BookingStatus = "waiting" | "in_progress" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "pending" | "paid" | "refunded" | "rejected" | "void";
export type PaymentMethod = "kpay" | "wavepay" | "ayapay" | "credit_points" | "cash" | "refund";
export type TransactionType = "payment" | "refund" | "credit_topup" | "adjustment";
export type MessageCategory =
  | "info"
  | "turn_near"
  | "your_turn"
  | "recall"
  | "delay"
  | "available"
  | "postponed"
  | "cancelled"
  | "payment";

export interface PaymentAccountSetting {
  provider: string;
  accountName: string;
  accountNumber: string;
  color: string;
}

export interface ClinicSettings {
  clinicName: string;
  clinicNameMy: string;
  clinicCodePrefix?: string;
  subtitleEn: string;
  subtitleMy: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  defaultFee: number;
  clinicPhone: string;
  addressMy: string;
  addressEn: string;
  receptionPin: string;
  superAdminPin: string;
  paymentAccounts: {
    kpay: PaymentAccountSetting;
    wavepay: PaymentAccountSetting;
    ayapay: PaymentAccountSetting;
  };
}

export interface Patient {
  id: string;
  patient_code: string;
  phone: string;
  name: string;
  credit_points: number;
  fcm_token: string | null;
  preferred_language: Lang;
  nrc_or_license?: string | null;
  previous_phones?: string[];
  qr_card_url?: string | null;
  created_at?: string;
}

export interface Doctor {
  id: string;
  doctor_code?: string;
  name: string;
  name_my: string | null;
  specialty: string;
  specialty_my: string | null;
  room_number: string;
  current_queue_number: number;
  queue_date: string | null;
  consultation_fee: number;
  start_time: string;
  end_time: string;
  max_patients: number;
  avg_consult_minutes: number;
  status: DoctorStatus;
  status_date: string | null;
  status_note: string | null;
  delay_minutes: number;
  postponed_to: string | null;
  is_active: boolean;
  is_archived: boolean;
  sort_order: number;
}

export interface Booking {
  id: string;
  patient_id: string;
  doctor_id: string;
  booking_date: string;
  queue_number: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  ticket_code: string | null;
  source: "online" | "walk_in";
  is_priority: boolean;
  checked_in_at: string | null;
  called_at: string | null;
  notified_near_at: string | null;
  qr_image_url: string | null;
  cancel_requested?: boolean;
  cancel_requested_at?: string | null;
  created_at: string;
}

export interface ReceptionNotification {
  id: string;
  type: "new_booking" | "cancel_request" | "booking_cancelled";
  booking_id: string;
  patient_id: string;
  patient_code?: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name_my: string;
  doctor_name_en: string;
  room_number: string;
  queue_number: number;
  payment_method: string;
  is_read: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  patient_id: string;
  booking_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  receipt_image_url: string | null;
  type: TransactionType;
  created_at: string;
}

export interface ClinicMessage {
  id: string;
  doctor_id: string | null;
  booking_id: string | null;
  patient_id: string | null;
  kind: "manual" | "automated";
  category: MessageCategory;
  title_en: string;
  body_en: string;
  title_my: string;
  body_my: string;
  message_date: string;
  created_at: string;
}

export type MessageInsert = Omit<ClinicMessage, "id" | "created_at" | "message_date"> & {
  message_date?: string;
};

/** Staff-only view of a patient (returned by /api/staff/data). */
export interface StaffPatient {
  id: string;
  phone: string;
  name: string;
  credit_points: number;
}
