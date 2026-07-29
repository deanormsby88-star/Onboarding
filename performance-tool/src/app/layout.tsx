import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heya Performance",
  description: "Weekly balanced-scorecard check-ins for the Heya team",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
