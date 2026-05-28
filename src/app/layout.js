import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DormPay",
  description: "Dormitory Payment System",
  icons: {
    icon: "/profile-old.webp",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <NextTopLoader
          color="#66BB6A"
          height={4}
          showSpinner={false}
          shadow="0 0 12px #2E7D32, 0 0 6px #66BB6A, 0 0 20px #A5D6A7"
        />
        {children}
      </body>
    </html>
  );
}
