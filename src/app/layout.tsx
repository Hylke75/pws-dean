import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/session";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PWS-tracker",
  description: "Alles voor je profielwerkstuk op één plek.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { profile } = await getSession();

  return (
    <html lang="nl" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        {profile && <Header profile={profile} />}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
