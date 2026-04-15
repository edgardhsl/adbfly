import type { Metadata } from "next";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { ToastProvider } from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "ADB Fly",
  description: "Explore and manage Android device data via ADB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
