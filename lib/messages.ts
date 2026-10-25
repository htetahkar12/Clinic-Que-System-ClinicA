import type { Doctor, MessageCategory } from "@/lib/types";
import { formatDate, toLocalDigits } from "@/lib/date";
import { formatCurrency, roomLabel } from "@/lib/utils";

/**
 * Bilingual (Myanmar + English) message templates.
 * Every patient-facing notification stores BOTH languages so the patient
 * always reads it in the language they selected.
 */
export interface BilingualText {
  title_en: string;
  body_en: string;
  title_my: string;
  body_my: string;
  category: MessageCategory;
}

type Doc = Pick<Doctor, "name" | "name_my" | "room_number">;

const nameMy = (d: Doc) => d.name_my || d.name;
const n = (v: number | string) => toLocalDigits(v, "my");

export const templates = {
  turnNear(doc: Doc, myNumber: number, ahead: number): BilingualText {
    const aheadEn = ahead <= 0 ? "You are next" : `${ahead} ${ahead === 1 ? "person" : "people"} ahead of you`;
    const aheadMy = ahead <= 0 ? "နောက်တစ်ယောက်မှာ သင်ဖြစ်ပါသည်" : `သင့်ရှေ့တွင် ${n(ahead)} ဦးသာ ကျန်ပါတော့သည်`;
    return {
      category: "turn_near",
      title_en: "Your turn is near — please come to the clinic",
      body_en: `Number #${myNumber}: ${aheadEn}. Please come to the clinic and wait near ${roomLabel(doc.room_number, "en")}.`,
      title_my: "သင့်အလှည့် နီးလာပါပြီ — ဆေးခန်းသို့ ကြွလာပေးပါ",
      body_my: `နံပါတ် ${n(myNumber)} — ${aheadMy}။ ဆေးခန်းသို့ လာရောက်ပြီး ${roomLabel(doc.room_number, "my")} အနီးတွင် စောင့်ဆိုင်းပေးပါ။`,
    };
  },

  yourTurn(doc: Doc, myNumber: number): BilingualText {
    return {
      category: "your_turn",
      title_en: "It's your turn now!",
      body_en: `Number #${myNumber}: please go to ${roomLabel(doc.room_number, "en")} to see ${doc.name}.`,
      title_my: "သင့်အလှည့် ရောက်ပါပြီ!",
      body_my: `နံပါတ် ${n(myNumber)} — ${nameMy(doc)} နှင့် ပြသရန် ${roomLabel(doc.room_number, "my")} သို့ ယခု ဝင်ရောက်ပေးပါ။`,
    };
  },

  recall(doc: Doc, myNumber: number): BilingualText {
    return {
      category: "recall",
      title_en: "We are calling you again",
      body_en: `Number #${myNumber}, please come to ${roomLabel(doc.room_number, "en")} now.`,
      title_my: "ထပ်မံ ခေါ်ယူနေပါသည်",
      body_my: `နံပါတ် ${n(myNumber)} ကို ထပ်မံ ခေါ်ယူနေပါသည်။ ${roomLabel(doc.room_number, "my")} သို့ ယခုပဲ ဝင်ရောက်ပေးပါ။`,
    };
  },

  delay(doc: Doc, minutes: number, note?: string | null): BilingualText {
    return {
      category: "delay",
      title_en: "Doctor is running late",
      body_en: `${doc.name} will be about ${minutes} minutes late. We are sorry for the wait.${note ? ` Note: ${note}` : ""}`,
      title_my: "ဆရာဝန် နောက်ကျပါမည်",
      body_my: `${nameMy(doc)} သည် မိနစ် ${n(minutes)} ခန့် နောက်ကျပါမည်။ စောင့်ဆိုင်းပေးရသည့်အတွက် တောင်းပန်အပ်ပါသည်။${note ? ` မှတ်ချက် — ${note}` : ""}`,
    };
  },

  available(doc: Doc): BilingualText {
    return {
      category: "available",
      title_en: "Doctor has arrived",
      body_en: `${doc.name} has arrived and is now seeing patients in ${roomLabel(doc.room_number, "en")}.`,
      title_my: "ဆရာဝန် ရောက်ရှိပါပြီ",
      body_my: `${nameMy(doc)} ရောက်ရှိပြီး ${roomLabel(doc.room_number, "my")} တွင် လူနာများကို စတင် ကြည့်ရှုနေပါပြီ။`,
    };
  },

  postponed(doc: Doc, newDate: string, newNumber: number, note?: string | null): BilingualText {
    return {
      category: "postponed",
      title_en: "Your appointment has been moved",
      body_en: `${doc.name}'s session today is postponed to ${formatDate(newDate, "en")}. Your new number is #${newNumber}. Your payment is kept for the new date.${note ? ` Note: ${note}` : ""}`,
      title_my: "ရက်ချိန်း ရွှေ့ဆိုင်းလိုက်ပါသည်",
      body_my: `${nameMy(doc)} ၏ ယနေ့ ပြသချိန်ကို ${formatDate(newDate, "my")} သို့ ရွှေ့ဆိုင်းလိုက်ရပါသည်။ သင့်နံပါတ်အသစ်မှာ ${n(newNumber)} ဖြစ်ပါသည်။ ပေးသွင်းပြီးသော ငွေကို ရက်သစ်အတွက် ဆက်လက် အသုံးပြုပေးပါမည်။${note ? ` မှတ်ချက် — ${note}` : ""}`,
    };
  },

  sessionCancelled(doc: Doc, refunded: number, note?: string | null): BilingualText {
    const refundEn = refunded > 0 ? ` ${formatCurrency(refunded, "en")} has been returned to your credit points.` : "";
    const refundMy = refunded > 0 ? ` ပေးသွင်းထားသော ${formatCurrency(refunded, "my")} ကို သင့်ပွိုင့်အဖြစ် ပြန်လည် ထည့်ပေးပြီးပါပြီ။` : "";
    return {
      category: "cancelled",
      title_en: "Today's session is cancelled",
      body_en: `We are sorry — ${doc.name} cannot see patients today.${refundEn}${note ? ` Note: ${note}` : ""}`,
      title_my: "ယနေ့ ပြသချိန် ဖျက်သိမ်းလိုက်ပါသည်",
      body_my: `${nameMy(doc)} ယနေ့ လူနာ မကြည့်နိုင်သဖြင့် တောင်းပန်အပ်ပါသည်။${refundMy}${note ? ` မှတ်ချက် — ${note}` : ""}`,
    };
  },

  bookingCancelled(doc: Doc, myNumber: number, refunded: number): BilingualText {
    const refundEn = refunded > 0 ? ` ${formatCurrency(refunded, "en")} has been returned to your credit points.` : "";
    const refundMy = refunded > 0 ? ` ${formatCurrency(refunded, "my")} ကို သင့်ပွိုင့်အဖြစ် ပြန်လည် ထည့်ပေးပြီးပါပြီ။` : "";
    return {
      category: "cancelled",
      title_en: "Your booking was cancelled",
      body_en: `Your booking #${myNumber} with ${doc.name} has been cancelled.${refundEn}`,
      title_my: "ရက်ချိန်း ဖျက်သိမ်းပြီးပါပြီ",
      body_my: `${nameMy(doc)} နှင့် ရက်ချိန်း နံပါတ် ${n(myNumber)} ကို ဖျက်သိမ်းပြီးပါပြီ။${refundMy}`,
    };
  },

  paymentVerified(doc: Doc, myNumber: number): BilingualText {
    return {
      category: "payment",
      title_en: "Payment confirmed",
      body_en: `Your payment for number #${myNumber} (${doc.name}) has been confirmed. Thank you!`,
      title_my: "ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ",
      body_my: `နံပါတ် ${n(myNumber)} (${nameMy(doc)}) အတွက် ငွေပေးချေမှုကို အတည်ပြုပြီးပါပြီ။ ကျေးဇူးတင်ပါသည်။`,
    };
  },

  paymentRejected(doc: Doc, myNumber: number): BilingualText {
    return {
      category: "payment",
      title_en: "Receipt could not be verified",
      body_en: `We could not verify your payment receipt for number #${myNumber} (${doc.name}). Please contact the reception desk.`,
      title_my: "ငွေလွှဲပြေစာ အတည်မပြုနိုင်ပါ",
      body_my: `နံပါတ် ${n(myNumber)} (${nameMy(doc)}) အတွက် ငွေလွှဲပြေစာကို စစ်ဆေး အတည်ပြု၍ မရပါ။ ကောင်တာသို့ ဆက်သွယ်ပေးပါရန်။`,
    };
  },
};

/** Quick templates shown to reception staff for manual messages. */
export const MANUAL_TEMPLATES: Array<{ key: string; label: string; title_en: string; body_en: string; title_my: string; body_my: string }> = [
  {
    key: "come_reception",
    label: "Please come to reception",
    title_en: "Please come to the reception desk",
    body_en: "Please come to the reception desk. Our staff would like to speak with you.",
    title_my: "ကောင်တာသို့ ကြွရောက်ပေးပါ",
    body_my: "ကောင်တာသို့ ခေတ္တ ကြွရောက်ပေးပါရန်။ ဝန်ထမ်းမှ ပြောကြားစရာ ရှိပါသည်။",
  },
  {
    key: "bring_records",
    label: "Bring previous records",
    title_en: "Please bring your medical records",
    body_en: "Please bring your previous prescriptions, lab results and X-ray films when you come.",
    title_my: "ယခင် ဆေးမှတ်တမ်းများ ယူဆောင်လာပါ",
    body_my: "လာရောက်သည့်အခါ ယခင် ဆေးစာ၊ သွေးစစ်ချက်နှင့် ဓာတ်မှန်များကို ယူဆောင်လာပေးပါရန်။",
  },
  {
    key: "fasting",
    label: "Fasting required",
    title_en: "Fasting required for blood test",
    body_en: "Please do not eat for 8 hours before your blood test. Drinking plain water is okay.",
    title_my: "သွေးစစ်ရန် အစာရှောင်ပေးပါ",
    body_my: "သွေးမစစ်မီ ၈ နာရီ အစာ ရှောင်ပေးပါ။ ရေသန့်သာ သောက်နိုင်ပါသည်။",
  },
  {
    key: "busy",
    label: "Clinic is busy",
    title_en: "The clinic is busy today",
    body_en: "The clinic is busier than usual today. Waiting time may be longer. Thank you for your patience.",
    title_my: "ယနေ့ လူနာ များပြားနေပါသည်",
    body_my: "ယနေ့ လူနာ ပုံမှန်ထက် များပြားနေသဖြင့် စောင့်ချိန် ကြာနိုင်ပါသည်။ စိတ်ရှည်စွာ စောင့်ဆိုင်းပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်။",
  },
];
