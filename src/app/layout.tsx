import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Obsidian Board",
  description: "Local Kanban triage for your Obsidian vault inbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
