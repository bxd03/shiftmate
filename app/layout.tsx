import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shiftmate · Warehouse workforce",
  description: "Standalone warehouse shift scheduling, worker sign-up and attendance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
