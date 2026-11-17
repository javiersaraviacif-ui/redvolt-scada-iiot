import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Redvolt — Ingeniería Eléctrica, Automatización y Telemetría IIoT",
  description:
    "Plataforma B2B de Monitoreo Crítico SCADA/IIoT, Armado y Certificación de Tableros Eléctricos (Normativa RIC/SEC), Automatización con PLCs y Mantenimiento Predictivo Industrial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="bg-[#0F172A] text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950 min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
