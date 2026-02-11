import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Planning Poker",
  description: "Real-time collaborative story point estimation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="system" storageKey="planning-poker-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
