import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getDictionary, getLocale } from "@/i18n";
import { dirFor } from "@/i18n/config";
import { IntlProvider } from "@/i18n/IntlProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "AI Visa — Canadian Immigration Applications",
  description:
    "Apply for Canadian permanent residence with AI Visa. Express Entry, Provincial Nominee, Family Sponsorship and Business immigration — reviewed by experts and processed by licensed lawyers.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} className={inter.variable}>
      <body>
        <IntlProvider locale={locale} dir={dir} dict={dict}>
          {children}
        </IntlProvider>
      </body>
    </html>
  );
}
