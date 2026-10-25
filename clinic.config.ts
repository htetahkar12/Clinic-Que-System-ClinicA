// ============================================================================
// WHITE-LABEL CONFIGURATION
// Change these values to re-brand the whole app for another clinic.
// ============================================================================

export const CLINIC_NAME = "AuraCare Poly Clinic";
export const CLINIC_NAME_MY = "အော်ရာကဲ ပေါ်လီဆေးခန်း";
export const PRIMARY_COLOR = "#0B5ED7"; // Brand colour (buttons, highlights)
export const SECONDARY_COLOR = "#1E3A8A"; // Gradient end colour (deep navy)
export const LOGO_URL = "/logo.svg";
export const CURRENCY = "MMK";
export const CURRENCY_MY = "ကျပ်";
export const CLINIC_TIMEZONE = "Asia/Yangon"; // must match public.clinic_today() in schema.sql
export const DEFAULT_LANGUAGE: "my" | "en" = "my"; // patients see Myanmar first

/** Patients get a "your turn is near" alert when this many people are ahead. */
export const NEAR_TURN_THRESHOLD = 3;

export type PaymentProviderKey = "kpay" | "wavepay" | "ayapay";

export const CLINIC_CONFIG = {
  name: CLINIC_NAME,
  nameMy: CLINIC_NAME_MY,
  primaryColor: PRIMARY_COLOR,
  secondaryColor: SECONDARY_COLOR,
  logoUrl: LOGO_URL,
  currency: CURRENCY,
  currencyMy: CURRENCY_MY,
  timezone: CLINIC_TIMEZONE,
  supportPhone: "09-777-888-999",
  address: "No. 124, Pyay Road, Kamayut Township, Yangon",
  addressMy: "အမှတ် ၁၂၄၊ ပြည်လမ်း၊ ကမာရွတ်မြို့နယ်၊ ရန်ကုန်",
  defaultConsultationFee: 15000,
  paymentAccounts: {
    kpay: {
      provider: "KBZPay",
      accountName: "AuraCare Poly Clinic",
      accountNumber: "09777888999",
      color: "#0A4DA2",
    },
    wavepay: {
      provider: "WavePay",
      accountName: "AuraCare Poly Clinic",
      accountNumber: "09777888999",
      color: "#F5B700",
    },
    ayapay: {
      provider: "AYA Pay",
      accountName: "AuraCare Poly Clinic",
      accountNumber: "09777888999",
      color: "#C8102E",
    },
  },
} as const;

export default CLINIC_CONFIG;
