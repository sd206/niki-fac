import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AIAssistant } from "@/components/AIAssistant";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Niki Family OS",
  description: "Your Family Operating System",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <AIAssistant />
        </Providers>
      </body>
    </html>
  );
}
