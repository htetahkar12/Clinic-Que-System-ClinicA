import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CLINIC_NAME, CLINIC_NAME_MY, PRIMARY_COLOR } from "@/clinic.config";
import { ClinicProvider } from "@/lib/clinic-store";
import { ClinicHeader } from "@/components/clinic-header";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${CLINIC_NAME} (${CLINIC_NAME_MY}) | Queue & Appointment Booking`,
  description:
    "Elderly-friendly White-Label Poly Clinic Live Queue Tracker and Pre-Paid Appointment Booking PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CLINIC_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: PRIMARY_COLOR,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="my">
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-950`}
      >
        <ClinicProvider>
          <ClinicHeader />
          <main className="flex-1">{children}</main>
        </ClinicProvider>
      </body>
    </html>
  );
}
