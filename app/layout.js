import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata = {
  title: "Wavely — Modern Messenger",
  description: "A fast, friendly, and responsive messaging experience.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b141a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
