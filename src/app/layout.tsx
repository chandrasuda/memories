import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memories",
  description: "Infinite canvas for your memories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased h-screen w-screen"
      >
        {children}
      </body>
    </html>
  );
}
