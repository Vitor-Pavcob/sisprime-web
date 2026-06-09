import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

// Cloudflare Pages (next-on-pages) exige edge runtime nas rotas server-rendered.
// No layout raiz, é herdado por toda a árvore.
export const runtime = "edge";

export const metadata: Metadata = {
  title: "Sisprime — Painel Jurídico",
  description: "Carteira e processos da Sisprime do Brasil",
  icons: { icon: "/sisprime-symbol.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
