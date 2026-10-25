# 🏥 Flutter Apps & Windows Installer Guide

ဤ Folder (`flutter_apps/`) တွင် သင်တောင်းဆိုထားသည့်အတိုင်း **Flutter App (၂) ခု** နှင့် **Reception + Doctor အတွက် သီးသန့် Windows Installer** တို့ကို တည်ဆောက်ပေးထားပါသည်-

---

## 1. App (၁) — Patient Android App (`flutter_apps/patient_app`)
* **ရည်ရွယ်ချက်:** လူနာများသာ သီးသန့်အသုံးပြုရန် Android App ဖြစ်ပါသည် (Reception သို့မဟုတ် SuperAdmin လင့်ခ်များ လုံးဝ မပါဝင်ပါ)။
* **အဓိက ပါဝင်သော စနစ်များ:**
  * **SMS ကုန်ကျစရိတ် 0 ကျပ် လူနာအကောင့်စနစ်:** အမည် + ဖုန်းနံပါတ် ဖြင့် အကောင့်သစ်ဖွင့်ခြင်း သို့မဟုတ် လူနာ ID (`[ClinicPrefix]YYMMDDTTTT`, ဥပမာ `ASC2610250001`) ဖြင့် အကောင့်ဟောင်း ပြန်ဝင်ခြင်း။
  * **လူနာ ID နှင့် QR ကတ် (Screenshot / ချရေးရန် သတိပေးချက်):** အကောင့်ဖွင့်ပြီးချိန်နှင့် အချိန်မရွေး ကြည့်ရှုသိမ်းဆည်းနိုင်သော QR ကတ်။
  * **တိုက်ရိုက် အလှည့်ကြည့်ရှုခြင်း (Live Queue `3 -> 4 -> 5`):** ဆရာဝန် မရောက်သေးပါက `မရောက်သေးပါ` ဟု ပြသပြီး ဆရာဝန်ရောက်ရှိမှ `#1` စတင်ပြသခြင်း။
  * **ဖုန်း Screen ပိတ်ထားသော်လည်း အသံမြည် Notification (`flutter_local_notifications`):** Reception မှ သတိပေးချက်ပို့ချိန်၊ ဘိုကင်အတည်ပြုချိန်နှင့် မိမိအလှည့်မရောက်မီ (၂) ဦးအလိုတွင် အသံမြည် (`တီ`) သတိပေးခြင်း။
  * **ဘိုကင်တင်ခြင်းနှင့် ပယ်ဖျက်ခြင်း:** KPay / WavePay / AYA Pay ပြေစာ Screenshot တင်ခြင်း၊ Credit ပွိုင့်ဖြင့် ဘိုကင်တင်ခြင်း၊ အလှည့်မရောက်မီ အနည်းဆုံး (၂) ဦးအလိုတွင် ပယ်ဖျက်၍ ပွိုင့်ပြန်တောင်းဆိုခြင်း။

### Local တွင် APK ထုတ်ရန် Command:
```bash
cd flutter_apps/patient_app
flutter pub get
flutter build apk --release
```

---

## 2. App (၂) — Reception + Doctor App (`flutter_apps/reception_doctor_app`)
* **ရည်ရွယ်ချက်:** ဆေးခန်း Reception ကောင်တာနှင့် ဆရာဝန်အခန်း (Consultation Room) အတွက် **Android App** နှင့် **Windows Desktop App** ဖြစ်ပါသည် (**SuperAdmin လုံးဝ မပါဝင်ပါ** — SuperAdmin ကို ပိုင်ရှင်မှ Web `/$uper@dmin` တွင်သာ သီးသန့် ထိန်းချုပ်နိုင်ပါသည်)။
* **အဓိက ပါဝင်သော စနစ်များ:**
  * **Mode (၃) ခု အလွယ်တကူ ပြောင်းလဲနိုင်ခြင်း:**
    1. **Reception ကောင်တာ စနစ် (`Reception Mode`)**
    2. **ဆရာဝန်အခန်း ထိန်းချုပ်စနစ် (`Doctor Room Mode`)**
    3. **စောင့်ဆိုင်းခန်း TV ဖန်သားပြင် (`TV Display Mode`)**
  * **Reception လုပ်ဆောင်ချက်များ:**
    * ဝန်ထမ်း PIN စကားဝှက် (`1234` default) နှင့် ကိုယ်တိုင် PIN ပြောင်းလဲခြင်း။
    * ဘိုကင်အသစ်နှင့် ပယ်ဖျက်ခွင့် တောင်းဆိုချက်များ ဝင်လာချိန် အသံမြည် Notification Banner ပြသခြင်း။
    * ထိုင်ခဲ့ဖူးသော ဆရာဝန်များကို နာမည်နှင့် အထူးကုဖြင့် ပြန်ရွေးနိုင်ခြင်း (Doctor Code အော်တိုပေါ်ခြင်း)၊ ဆရာဝန်အသစ်ထည့်ခြင်း။
    * **`[ဆရာဝန်ရောက်ပြီ (#1 စခေါ်မည်)]`** နှင့် **`[နောက်လူနာ ခေါ်မည် (+1)]`**။
    * **လူနာ ID / QR Code Scanner (`mobile_scanner`) ဖြင့် ရှာဖွေခြင်းနှင့် မှတ်ပုံတင်/ယာဉ်မောင်းလိုင်စင် စစ်ဆေး၍ ဖုန်းနံပါတ်အသစ်ပြောင်းပေးခြင်း (Credit ပွိုင့်များ ပြန်လည်ရရှိစေခြင်း)**။
    * Reception မှ Walk-in Booking တိုက်ရိုက်တင်ပေးခြင်း၊ ပြေစာစစ်ဆေးအတည်ပြုခြင်းနှင့် ရက်ချိန်းပယ်ဖျက် ပွိုင့်ပြန်အမ်းခြင်း။
  * **Doctor Room လုပ်ဆောင်ချက်များ:**
    * ဆရာဝန်အခန်း ရွေးချယ်၍ **`[ဆရာဝန်ရောက်ပြီ — #1 စတင်ခေါ်ဆိုမည်]`** နှင့် **`[နောက်လူနာ ခေါ်မည် (+1)]`** ခလုတ်ကြီးဖြင့် အလွယ်တကူ ခေါ်ဆိုနိုင်ခြင်း။

### Local တွင် Android APK နှင့် Windows Exe ထုတ်ရန် Command:
```bash
cd flutter_apps/reception_doctor_app
flutter pub get
# Android APK အတွက်
flutter build apk --release
# Windows Desktop အတွက်
flutter build windows --release
```

---

## 3. Windows Installer (`Reception + Doctor` အတွက်သာ)
* **အသင့်သုံးနိုင်သော Windows Installer ဖိုင်နေရာများ:**
  * [`installers/Clinic-Reception-Doctor-Windows-Setup.exe`](../installers/Clinic-Reception-Doctor-Windows-Setup.exe)
  * [`public/downloads/Clinic-Reception-Doctor-Windows-Setup.exe`](../public/downloads/Clinic-Reception-Doctor-Windows-Setup.exe) (Web `/reception` စာမျက်နှာပေါ်ရှိ **`[Windows Installer (.exe) ဒေါင်းရန်]`** ခလုတ်မှလည်း တိုက်ရိုက် ဒေါင်းလုဒ်ဆွဲနိုင်ပါသည်)
* **Inno Setup Script (Flutter Windows Release အတွက်):**
  * [`flutter_apps/reception_doctor_app/installer/reception_doctor_setup.iss`](./reception_doctor_app/installer/reception_doctor_setup.iss)
* **GitHub Actions Auto-Build (`.github/workflows/build-flutter-apps.yml`):**
  * GitHub သို့ `git push` လုပ်လိုက်တိုင်း GitHub Actions မှ အောက်ပါဖိုင် (၃) ခုကို အလိုအလျောက် Build လုပ်ပေးပါသည်-
    1. `Clinic-Patient-Android-APK` (`app-release.apk`)
    2. `Clinic-Reception-Doctor-Android-APK` (`app-release.apk`)
    3. `Clinic-Reception-Doctor-Windows-Installer` (`Clinic-Reception-Doctor-Windows-Setup.exe`)
