import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CLINIC_NAME, PRIMARY_COLOR } from "@/clinic.config";
import { ClinicProvider } from "@/lib/clinic-store";
import { ClinicHeader } from "@/components/clinic-header";
import { DevPortalSwitcher } from "@/components/dev-portal-switcher";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${CLINIC_NAME} | Queue & Appointment Booking`,
  description:
    "Elderly-friendly White-Label Poly Clinic Live Queue Tracker and Appointment Booking PWA",
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
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-950`}>
        <ClinicProvider>
          <ClinicHeader />
          <main className="flex-1">{children}</main>
          <DevPortalSwitcher />
        </ClinicProvider>
      </body>
    </html>
  );
}
