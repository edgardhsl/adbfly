import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "ADB Device Explorer",
  description: "Explore and manage Android device data via ADB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${manrope.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
