import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bot Talk",
  description:
    "An interactive chatbot game presented by AI club ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

