import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SQL Query Coach",
  description: "Analyze SQL queries with deterministic heuristics and coaching-friendly guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-base-900 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
