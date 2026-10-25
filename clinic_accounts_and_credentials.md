# 🏥 Clinic Queue & Booking System — Accounts & Credentials Reference

> [!IMPORTANT]
> ဤဖိုင်သည် ဆေးခန်း Queue & Booking စနစ်အတွက် အသုံးပြုထားသော **Supabase, Vercel, GitHub, Cloudinary, Gmail** အကောင့်များနှင့် Portal လိပ်စာများကို မမေ့စေရန် စုစည်းမှတ်တမ်းတင်ထားသော Reference ဖိုင်ဖြစ်ပါသည်။

---

## 1. အသုံးပြုထားသော အဓိက Email အကောင့်များ (Master Accounts)

| ဝန်ဆောင်မှု (Service) | အသုံးပြုထားသော Email Account | အသုံးပြုသည့် ကဏ္ဍ (Purpose) |
| :--- | :--- | :--- |
| **Supabase** (Database & Realtime) | `tasaya4.300@gmail.com` | PostgreSQL Database, Live Queue Sync, Storage |
| **GitHub** (Source Code Repository) | `htetahkar12@gmail.com` | GitHub Code Hosting (`htetahkar12`) |
| **Vercel** (Cloud Hosting & Deployment) | `htetahkar12@gmail.com` | Next.js PWA Auto-Deployment from GitHub |
| **Cloudinary** (Receipt & Logo Cloud Storage) | `htetahkar12@gmail.com` | KPay / WavePay / AYA Pay ငွေလွှဲပြေစာပုံများနှင့် ဆေးခန်း Logo သိမ်းဆည်းရန် |
| **Gmail** (Primary Contact) | `htetahkar12@gmail.com` / `tasaya4.300@gmail.com` | ဝန်ဆောင်မှုအကောင့်များ ချိတ်ဆက်ထားသော ပင်မအီးမေးလ်များ |

---

## 2. GitHub & Vercel Deployment အချက်အလက်များ

* **GitHub Account:** `htetahkar12@gmail.com` (`htetahkar12`)
* **GitHub Repository URL:** `https://github.com/htetahkar12/Clinic-Que-System-ClinicA.git`
* **Default Branch:** `main`
* **Vercel Account:** `htetahkar12@gmail.com` (GitHub `main` branch သို့ `git push` လုပ်လိုက်တိုင်း Vercel မှ အလိုအလျောက် Deploy လုပ်ပေးပါသည်)

---

## 3. Supabase Configuration (`tasaya4.300@gmail.com`)

* **Supabase Account Email:** `tasaya4.300@gmail.com`
* **Project URL (`NEXT_PUBLIC_SUPABASE_URL`):** `https://drgncfvnsrwyshpnfmpc.supabase.co`
* **Anon Public Key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`):**
  ```text
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZ25jZnZuc3J3eXNocG5mbXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk2MzAsImV4cCI6MjA4OTMyNTYzMH0.F74-H3x-6vD-yL4L7iI9_n1U03jC9V1g6S-k9A4f1xM
  ```

---

## 4. Cloudinary Configuration (`htetahkar12@gmail.com`)

* **Cloudinary Account Email:** `htetahkar12@gmail.com`
* **Cloud Name (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`):** `dy7n62n5d`
* **API Key (`CLOUDINARY_API_KEY`):** `627117378434684`
* **API Secret (`CLOUDINARY_API_SECRET`):** `o-7_9H-aW-r0g216OnFHlB3671A`

---

## 5. ဆေးခန်း Portal လိပ်စာများနှင့် Default PIN နံပါတ်များ

| Portal အမျိုးအစား | URL လမ်းကြောင်း (Route) | Default PIN / OTP | မှတ်ချက် |
| :--- | :--- | :--- | :--- |
| **လူနာ ပေါ်တယ် (Patient Portal)** | `/` | OTP: `1234` | အကောင့်သစ်ဖွင့်လျှင် အော်တို Credit Points မပါဝင်ပါ (`0 MMK`)။ ဘိုကင်တင်တိုင်း Reception မှ အတည်ပြုပေးရပါသည်။ |
| **Reception Command Center** | `/reception` | PIN: `1234` | Reception ဝန်ထမ်းကိုယ်တိုင် `[PIN ပြောင်းမည်]` ခလုတ်မှတစ်ဆင့် စကားဝှက် ပြောင်းလဲနိုင်ပါသည်။ |
| **Super Admin Portal** | `/$uper@dmin` | PIN: `1234` | ဆေးခန်းအမည်၊ Logo၊ KPay/WavePay/AYA Pay ဖုန်းနံပါတ်များနှင့် Super Admin PIN ကို စိတ်ကြိုက်ပြင်ဆင်နိုင်ပါသည်။ |
| **TV Display (Waiting Room)** | `/tv` | စကားဝှက်မလိုပါ | ဆေးခန်းစောင့်ဆိုင်းခန်းရှိ TV ဖန်သားပြင်တွင် ချိတ်ဆက်ပြသရန်။ |

---

## 6. `.env.local` နမူနာ (Environment Variables)

Vercel သို့မဟုတ် ကွန်ပျူတာအသစ်တွင် ပြန်လည်ထည့်သွင်းလိုပါက အောက်ပါ Environment Variables များကို အသုံးပြုနိုင်ပါသည်-

```env
NEXT_PUBLIC_SUPABASE_URL=https://drgncfvnsrwyshpnfmpc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZ25jZnZuc3J3eXNocG5mbXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk2MzAsImV4cCI6MjA4OTMyNTYzMH0.F74-H3x-6vD-yL4L7iI9_n1U03jC9V1g6S-k9A4f1xM
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dy7n62n5d
CLOUDINARY_API_KEY=627117378434684
CLOUDINARY_API_SECRET=o-7_9H-aW-r0g216OnFHlB3671A
```
